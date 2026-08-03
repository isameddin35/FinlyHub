package com.finlyhub.common.service;

import ai.djl.huggingface.tokenizers.Encoding;
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer;
import com.finlyhub.common.exception.BusinessException;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OnnxBgeEmbeddingService implements TokenizerService {

    private static final int EMBEDDING_DIM = 384;
    private static final int MAX_LENGTH = 512;
    private static final int MAX_BATCH_SIZE = 32;

    private final ResourceLoader resourceLoader;
    private final String modelUri;
    private final String tokenizerUri;

    private OrtEnvironment ortEnvironment;
    private OrtSession ortSession;
    private HuggingFaceTokenizer tokenizer;

    public OnnxBgeEmbeddingService(
            ResourceLoader resourceLoader,
            @Value("${ai.onnx.model-uri:classpath:models/bge-small-en-v1.5/model.onnx}") String modelUri,
            @Value("${ai.onnx.tokenizer-uri:classpath:models/bge-small-en-v1.5/tokenizer.json}") String tokenizerUri) {
        this.resourceLoader = resourceLoader;
        this.modelUri = modelUri;
        this.tokenizerUri = tokenizerUri;
    }

    @PostConstruct
    public void init() {
        try {
            this.ortEnvironment = OrtEnvironment.getEnvironment();

            Path modelPath = resolveToTempPath(modelUri, "bge-small-en-v1.5-model.onnx");
            this.ortSession = ortEnvironment.createSession(modelPath.toString());

            Path tokenizerPath = resolveToTempPath(tokenizerUri, "bge-small-en-v1.5-tokenizer.json");
            this.tokenizer = HuggingFaceTokenizer.newInstance(tokenizerPath);

            log.info("ONNX BGE embedding model loaded: dim={}, max_length={}", EMBEDDING_DIM, MAX_LENGTH);
        } catch (Exception e) {
            log.error("Failed to load ONNX embedding model", e);
            throw new BusinessException("ONNX model load failed: " + e.getMessage());
        }
    }

    @PreDestroy
    public void destroy() {
        try {
            if (ortSession != null) ortSession.close();
            if (tokenizer != null) tokenizer.close();
        } catch (Exception e) {
            log.warn("Error closing ONNX resources", e);
        }
    }

    public List<Float> embed(String text) {
        List<List<Float>> batch = embedBatch(List.of(text));
        return batch.isEmpty() ? List.of() : batch.get(0);
    }

    public List<List<Float>> embedBatch(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return List.of();
        }
        List<List<Float>> all = new ArrayList<>(texts.size());
        for (int start = 0; start < texts.size(); start += MAX_BATCH_SIZE) {
            int end = Math.min(start + MAX_BATCH_SIZE, texts.size());
            all.addAll(embedBatchInternal(texts.subList(start, end)));
        }
        return all;
    }

    List<List<Float>> embedBatchInternal(List<String> texts) {
        try {
            int batchSize = texts.size();
            Encoding[] encodings = new Encoding[batchSize];
            int maxLen = 0;
            for (int i = 0; i < batchSize; i++) {
                encodings[i] = tokenizer.encode(texts.get(i));
                maxLen = Math.max(maxLen, Math.min(encodings[i].getIds().length, MAX_LENGTH));
            }
            maxLen = Math.max(maxLen, 1);

            long[][] inputIds = new long[batchSize][maxLen];
            long[][] attentionMask = new long[batchSize][maxLen];
            long[][] tokenTypeIds = new long[batchSize][maxLen];

            for (int i = 0; i < batchSize; i++) {
                long[] ids = encodings[i].getIds();
                long[] mask = encodings[i].getAttentionMask();
                long[] types = encodings[i].getTypeIds();
                int len = Math.min(ids.length, maxLen);
                System.arraycopy(ids, 0, inputIds[i], 0, len);
                System.arraycopy(mask, 0, attentionMask[i], 0, len);
                System.arraycopy(types, 0, tokenTypeIds[i], 0, len);
            }

            Map<String, OnnxTensor> inputs = new HashMap<>();
            inputs.put("input_ids", OnnxTensor.createTensor(ortEnvironment, inputIds));
            inputs.put("attention_mask", OnnxTensor.createTensor(ortEnvironment, attentionMask));
            inputs.put("token_type_ids", OnnxTensor.createTensor(ortEnvironment, tokenTypeIds));

            OrtSession.Result result = ortSession.run(inputs);
            float[][][] output = (float[][][]) result.get(0).getValue();

            List<List<Float>> embeddings = new ArrayList<>(batchSize);
            for (int i = 0; i < batchSize; i++) {
                float[] flat = flatten(output[i]);
                embeddings.add(meanPooling(flat, attentionMask[i]));
            }

            result.close();
            inputs.values().forEach(OnnxTensor::close);

            return embeddings;
        } catch (Exception e) {
            log.error("ONNX batch embedding failed for texts size={}", texts.size(), e);
            List<List<Float>> fallback = new ArrayList<>(texts.size());
            for (int i = 0; i < texts.size(); i++) {
                fallback.add(new ArrayList<>());
            }
            return fallback;
        }
    }

    private float[] flatten(float[][] matrix) {
        int rows = matrix.length;
        if (rows == 0) {
            return new float[0];
        }
        int cols = matrix[0].length;
        float[] flat = new float[rows * cols];
        for (int i = 0; i < rows; i++) {
            System.arraycopy(matrix[i], 0, flat, i * cols, cols);
        }
        return flat;
    }

    @Override
    public int countTokens(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        try {
            return tokenizer.encode(text).getIds().length;
        } catch (Exception e) {
            log.warn("Token count failed, treating as empty", e);
            return 0;
        }
    }

    public int getDimension() {
        return EMBEDDING_DIM;
    }

    private List<Float> meanPooling(float[] modelOutput, long[] attentionMask) {
        float[] pooled = new float[EMBEDDING_DIM];
        float maskSum = 0f;

        int seqLen = Math.min(attentionMask.length, modelOutput.length / EMBEDDING_DIM);
        for (int i = 0; i < seqLen; i++) {
            float mask = (float) attentionMask[i];
            maskSum += mask;
            for (int j = 0; j < EMBEDDING_DIM; j++) {
                pooled[j] += modelOutput[i * EMBEDDING_DIM + j] * mask;
            }
        }

        if (maskSum > 0) {
            for (int j = 0; j < EMBEDDING_DIM; j++) {
                pooled[j] /= maskSum;
            }
        }

        float norm = 0f;
        for (float v : pooled) norm += v * v;
        norm = (float) Math.sqrt(norm);

        if (norm > 0) {
            for (int j = 0; j < EMBEDDING_DIM; j++) {
                pooled[j] /= norm;
            }
        }

        List<Float> result = new ArrayList<>(EMBEDDING_DIM);
        for (float v : pooled) result.add(v);
        return result;
    }

    private Path resolveToTempPath(String uri, String tempFileName) throws Exception {
        Path tempPath = Path.of(System.getProperty("java.io.tmpdir"), "finlyhub-onnx", tempFileName);
        if (Files.exists(tempPath) && Files.size(tempPath) > 0) {
            return tempPath;
        }
        Files.createDirectories(tempPath.getParent());
        try (InputStream is = resourceLoader.getResource(uri).getInputStream()) {
            Files.copy(is, tempPath, StandardCopyOption.REPLACE_EXISTING);
        }
        log.info("Downloaded ONNX resource {} to {}", uri, tempPath);
        return tempPath;
    }
}
