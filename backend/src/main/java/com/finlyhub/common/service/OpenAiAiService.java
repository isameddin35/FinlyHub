package com.finlyhub.common.service;

import com.finlyhub.common.model.CategorizationResult;
import com.finlyhub.common.model.ChatRequest;
import com.finlyhub.common.model.ChatResponse;
import com.finlyhub.common.model.ExtractionResult;
import com.finlyhub.common.model.SourceDocument;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.theokanning.openai.OpenAiApi;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import com.theokanning.openai.embedding.EmbeddingRequest;
import com.theokanning.openai.service.OpenAiService;
import io.reactivex.Flowable;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.HttpUrl;
import okhttp3.Request;
import org.springframework.beans.factory.annotation.Value;
import retrofit2.Retrofit;
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory;
import retrofit2.converter.jackson.JacksonConverterFactory;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

@Slf4j
public class OpenAiAiService implements AiService {

    private OpenAiService openAiService;
    private OpenAiService embeddingOpenAiService;
    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final String embeddingModel;
    private final String embeddingBaseUrl;
    private final String embeddingApiKey;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OpenAiAiService(String baseUrl,
                            String apiKey,
                            @Value("${ai.openai.model}") String model,
                            @Value("${ai.openai.embedding-model}") String embeddingModel,
                            @Value("${ai.openai.embedding-base-url}") String embeddingBaseUrl,
                            @Value("${ai.openai.embedding-api-key}") String embeddingApiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.embeddingModel = embeddingModel;
        this.embeddingBaseUrl = embeddingBaseUrl;
        this.embeddingApiKey = embeddingApiKey;
    }

    @PostConstruct
    public void init() {
        ObjectMapper mapper = OpenAiService.defaultObjectMapper();
        OkHttpClient client = OpenAiService.defaultClient(apiKey, Duration.ofSeconds(300))
                .newBuilder()
                .connectTimeout(Duration.ofSeconds(60))
                .readTimeout(Duration.ofSeconds(300))
                .writeTimeout(Duration.ofSeconds(300))
                .addInterceptor(chain -> {
                    Request request = chain.request();
                    HttpUrl url = request.url();
                    String path = url.encodedPath();
                    if (path.startsWith("/v1/")) {
                        url = url.newBuilder().encodedPath("/openai" + path).build();
                        request = request.newBuilder().url(url).build();
                    }
                    return chain.proceed(request);
                })
                .build();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/")
                .client(client)
                .addConverterFactory(JacksonConverterFactory.create(mapper))
                .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
                .build();

        OpenAiApi api = retrofit.create(OpenAiApi.class);
        this.openAiService = new OpenAiService(api);

        OkHttpClient embeddingClient = OpenAiService.defaultClient(embeddingApiKey, Duration.ofSeconds(30))
                .newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(30))
                .writeTimeout(Duration.ofSeconds(30))
                .build();

        Retrofit embeddingRetrofit = new Retrofit.Builder()
                .baseUrl(embeddingBaseUrl.endsWith("/") ? embeddingBaseUrl : embeddingBaseUrl + "/")
                .client(embeddingClient)
                .addConverterFactory(JacksonConverterFactory.create(mapper))
                .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
                .build();

        OpenAiApi embeddingApi = embeddingRetrofit.create(OpenAiApi.class);
        this.embeddingOpenAiService = new OpenAiService(embeddingApi);
    }

    @Override
    public ExtractionResult extractInvoiceData(String ocrText) {
        ChatMessage systemMessage = new ChatMessage(ChatMessageRole.SYSTEM.value(),
                "You are an expert invoice data extraction assistant. Extract structured data from OCR text. " +
                "Return ONLY valid JSON. Do not include any explanation or markdown formatting.");

        String prompt = """
                Extract invoice data from the OCR text below.
                Return JSON with: invoiceNumber, vendor, vendorEmail, vendorAddress,
                date, dueDate, subtotal, tax, vat, total, currency.
                Use null for missing fields.
                currency must be an ISO 4217 code (e.g., USD, EUR, GBP) — never a symbol like $, €, or £.

                OCR Text:
                """ + ocrText;

        ChatMessage message = new ChatMessage(ChatMessageRole.USER.value(), prompt);
        ChatCompletionRequest request = ChatCompletionRequest.builder()
                .model(model)
                .messages(List.of(systemMessage, message))
                .temperature(0.1)
                .maxTokens(500)
                .build();

        try {
            String response = openAiService.createChatCompletion(request)
                    .getChoices().get(0).getMessage().getContent();
            return parseExtractionResponse(response);
        } catch (Exception e) {
            log.error("AI extraction failed", e);
            throw new RuntimeException("AI extraction failed: " + e.getMessage());
        }
    }

    @Override
    public ChatResponse chat(ChatRequest request) {
        List<ChatMessage> messages = buildChatMessages(request);

        ChatCompletionRequest completionRequest = ChatCompletionRequest.builder()
                .model(model)
                .messages(messages)
                .temperature(0.3)
                .maxTokens(1000)
                .build();

        try {
            String content = openAiService.createChatCompletion(completionRequest)
                    .getChoices().get(0).getMessage().getContent();

            return ChatResponse.builder()
                    .message(content)
                    .sources(request.getRelevantDocuments())
                    .confidenceScore(0.85)
                    .build();
        } catch (Exception e) {
            log.error("AI chat failed", e);
            throw new RuntimeException("AI chat failed: " + e.getMessage());
        }
    }

    @Override
    public void streamChat(ChatRequest request, Consumer<String> onToken, Runnable onComplete) {
        List<ChatMessage> messages = buildChatMessages(request);

        ChatCompletionRequest completionRequest = ChatCompletionRequest.builder()
                .model(model)
                .messages(messages)
                .temperature(0.3)
                .maxTokens(1000)
                .stream(true)
                .build();

        try {
            openAiService.streamChatCompletion(completionRequest)
                    .blockingSubscribe(chunk -> {
                        var choices = chunk.getChoices();
                        if (choices != null && !choices.isEmpty()) {
                            ChatMessage delta = choices.get(0).getMessage();
                            if (delta != null && delta.getContent() != null) {
                                onToken.accept(delta.getContent());
                            }
                        }
                    });
        } catch (Exception e) {
            log.error("AI chat stream failed", e);
            throw new RuntimeException("AI chat stream failed: " + e.getMessage());
        }

        onComplete.run();
    }

    private List<ChatMessage> buildChatMessages(ChatRequest request) {
        List<ChatMessage> messages = new ArrayList<>();

        StringBuilder systemPrompt = new StringBuilder("""
                You are an expert accounting assistant. Answer questions based on the provided documentation.
                Always cite your sources. If you don't know, say so.
                
                Relevant documentation:
                """);

        if (request.getRelevantDocuments() != null) {
            for (SourceDocument doc : request.getRelevantDocuments()) {
                systemPrompt.append("\n--- Source: ").append(doc.getFilename()).append(" ---\n");
                systemPrompt.append(doc.getExcerpt()).append("\n");
            }
        }

        messages.add(new ChatMessage(ChatMessageRole.SYSTEM.value(), systemPrompt.toString()));

        if (request.getConversationHistory() != null) {
            for (int i = 0; i < request.getConversationHistory().size(); i++) {
                ChatMessageRole role = (i % 2 == 0) ? ChatMessageRole.USER : ChatMessageRole.ASSISTANT;
                messages.add(new ChatMessage(role.value(), request.getConversationHistory().get(i)));
            }
        }

        messages.add(new ChatMessage(ChatMessageRole.USER.value(), request.getMessage()));
        return messages;
    }

    @Override
    public List<Float> generateEmbedding(String text) {
        EmbeddingRequest request = EmbeddingRequest.builder()
                .model(embeddingModel)
                .input(List.of(text))
                .build();

        try {
            List<Double> doubles = embeddingOpenAiService.createEmbeddings(request)
                    .getData().get(0).getEmbedding();
            return doubles.stream()
                    .map(Double::floatValue)
                    .toList();
        } catch (Exception e) {
            log.error("Embedding API failed, returning empty results", e);
            return List.of();
        }
    }

    @Override
    public CategorizationResult categorizeTransaction(String description, double amount) {
        String prompt = String.format("""
                Categorize this transaction:
                Description: %s
                Amount: %.2f
                
                Choose from: Meals & Entertainment, Software & Subscriptions, Transportation,
                Office Supplies, Rent & Utilities, Professional Services, Revenue, Taxes, Payroll, Uncategorized
                
                Return JSON: {"category": "category_name", "confidence": 0.0-1.0, "reasoning": "short reason"}
                """, description, amount);

        ChatMessage message = new ChatMessage(ChatMessageRole.USER.value(), prompt);
        ChatCompletionRequest request = ChatCompletionRequest.builder()
                .model(model)
                .messages(List.of(message))
                .temperature(0.1)
                .maxTokens(150)
                .build();

        try {
            String response = openAiService.createChatCompletion(request)
                    .getChoices().get(0).getMessage().getContent();
            return parseCategorizationResponse(response);
        } catch (Exception e) {
            log.error("AI categorization failed", e);
            return CategorizationResult.builder()
                    .categoryName("Uncategorized")
                    .confidenceScore(0.0)
                    .reasoning("AI categorization failed")
                    .build();
        }
    }

    private ExtractionResult parseExtractionResponse(String response) {
        try {
            var json = objectMapper.readTree(response);
            return ExtractionResult.builder()
                    .invoiceNumber(json.has("invoiceNumber") ? json.get("invoiceNumber").asText() : null)
                    .vendor(json.has("vendor") ? json.get("vendor").asText() : null)
                    .vendorEmail(json.has("vendorEmail") && !json.get("vendorEmail").isNull() ? json.get("vendorEmail").asText() : null)
                    .vendorAddress(json.has("vendorAddress") && !json.get("vendorAddress").isNull() ? json.get("vendorAddress").asText() : null)
                    .date(json.has("date") ? json.get("date").asText() : null)
                    .dueDate(json.has("dueDate") && !json.get("dueDate").isNull() ? json.get("dueDate").asText() : null)
                    .subtotal(json.has("subtotal") && !json.get("subtotal").isNull() ? json.get("subtotal").asDouble() : null)
                    .tax(json.has("tax") && !json.get("tax").isNull() ? json.get("tax").asDouble() : null)
                    .vat(json.has("vat") && !json.get("vat").isNull() ? json.get("vat").asDouble() : null)
                    .total(json.has("total") && !json.get("total").isNull() ? json.get("total").asDouble() : null)
                    .currency(json.has("currency") ? json.get("currency").asText() : "USD")
                    .confidence(85.0)
                    .rawResponse(response)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse extraction response", e);
            return ExtractionResult.builder()
                    .rawResponse(response)
                    .confidence(0.0)
                    .build();
        }
    }

    private CategorizationResult parseCategorizationResponse(String response) {
        try {
            var json = objectMapper.readTree(response);
            return CategorizationResult.builder()
                    .categoryName(json.get("category").asText())
                    .confidenceScore(json.get("confidence").asDouble() * 100)
                    .reasoning(json.has("reasoning") ? json.get("reasoning").asText() : null)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse categorization response", e);
            return CategorizationResult.builder()
                    .categoryName("Uncategorized")
                    .confidenceScore(0.0)
                    .reasoning("Parse failed")
                    .build();
        }
    }
}
