package com.finlyhub.common.service;

import ai.djl.huggingface.tokenizers.Encoding;
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer;
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
public class OnnxBgeEmbeddingService {

    private static final int EMBEDDING_DIM = 384;
    private static final int MAX_LENGTH = 512;

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
            throw new RuntimeException("ONNX model load failed: " + e.getMessage(), e);
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
        return List.copyOf(embedInternal(text));
    }

    public List<List<Float>> embedBatch(List<String> texts) {
        return texts.stream().map(t -> List.copyOf(embedInternal(t))).toList();
    }

    public int getDimension() {
        return EMBEDDING_DIM;
    }

    private List<Float> embedInternal(String text) {
        try {
            Encoding encoding = tokenizer.encode(text);

            long[] inputIds = new long[MAX_LENGTH];
            long[] attentionMask = new long[MAX_LENGTH];
            long[] tokenTypeIds = new long[MAX_LENGTH];

            long[] ids = encoding.getIds();
            long[] mask = encoding.getAttentionMask();
            long[] types = encoding.getTypeIds();

            int len = Math.min(ids.length, MAX_LENGTH);
            System.arraycopy(ids, 0, inputIds, 0, len);
            System.arraycopy(mask, 0, attentionMask, 0, len);
            System.arraycopy(types, 0, tokenTypeIds, 0, len);

            Map<String, OnnxTensor> inputs = new HashMap<>();
            inputs.put("input_ids", OnnxTensor.createTensor(ortEnvironment, new long[][]{inputIds}));
            inputs.put("attention_mask", OnnxTensor.createTensor(ortEnvironment, new long[][]{attentionMask}));
            inputs.put("token_type_ids", OnnxTensor.createTensor(ortEnvironment, new long[][]{tokenTypeIds}));

            OrtSession.Result result = ortSession.run(inputs);
            float[][][] output = (float[][][]) result.get(0).getValue();

            result.close();
            inputs.values().forEach(OnnxTensor::close);

            return meanPooling(output[0][0], encoding.getAttentionMask(), text.length());
        } catch (Exception e) {
            log.error("ONNX embedding failed for text length={}", text.length(), e);
            return new ArrayList<>(EMBEDDING_DIM);
        }
    }

    private List<Float> meanPooling(float[] modelOutput, long[] attentionMask, int textLength) {
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
