package com.finlyhub.common.service;

import com.finlyhub.common.model.CategorizationResult;
import com.finlyhub.common.model.ChatRequest;
import com.finlyhub.common.model.ChatResponse;
import com.finlyhub.common.model.ExtractionResult;
import com.finlyhub.common.model.SourceDocument;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.Consumer;

public class MockAiService implements AiService {

    private static final Random random = new Random();

    @Override
    public ExtractionResult extractInvoiceData(String ocrText) {
        return ExtractionResult.builder()
                .invoiceNumber("INV-2026-" + String.format("%03d", random.nextInt(999) + 1))
                .vendor(detectVendor(ocrText))
                .date("2026-0" + (random.nextInt(8) + 1) + "-0" + (random.nextInt(27) + 1))
                .subtotal(round(random.nextDouble() * 5000))
                .tax(round(random.nextDouble() * 500))
                .vat(round(random.nextDouble() * 1000))
                .total(round(random.nextDouble() * 6000))
                .currency("USD")
                .confidence(round(85 + random.nextDouble() * 15))
                .fieldConfidence(Map.of(
                        "invoiceNumber", round(90 + random.nextDouble() * 10),
                        "vendor", round(85 + random.nextDouble() * 15),
                        "date", round(88 + random.nextDouble() * 12),
                        "total", round(92 + random.nextDouble() * 8)
                ))
                .rawResponse("{\"invoiceNumber\":\"INV-2026-XX\",\"vendor\":\"Company\",...}")
                .build();
    }

    @Override
    public ChatResponse chat(ChatRequest request) {
        return ChatResponse.builder()
                .message(getCannedResponse())
                .sources(getCannedSources())
                .confidenceScore(0.92)
                .build();
    }

    @Override
    public void streamChat(ChatRequest request, Consumer<String> onToken, Runnable onComplete) {
        String response = getCannedResponse();
        String[] words = response.split(" ");
        for (int i = 0; i < words.length; i++) {
            onToken.accept((i > 0 ? " " : "") + words[i]);
            try {
                Thread.sleep(30);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        onComplete.run();
    }

    private String getCannedResponse() {
        return "Based on the documentation provided, the VAT rate for consulting services is typically 20% for B2B transactions within the EU. For cross-border services, the reverse charge mechanism may apply. I recommend consulting the specific tax regulations for your jurisdiction.\n\nSources referenced:\n- Tax Policy Guidelines 2026 (Section 4.2)\n- EU VAT Directive Implementation Guide";
    }

    private List<SourceDocument> getCannedSources() {
        return List.of(
                SourceDocument.builder()
                        .documentId(1L)
                        .filename("tax_policy_2026.pdf")
                        .excerpt("Section 4.2: VAT on professional services...")
                        .relevanceScore(0.95)
                        .chunkIndex(3)
                        .build(),
                SourceDocument.builder()
                        .documentId(2L)
                        .filename("eu_vat_directive.docx")
                        .excerpt("Article 44: Place of supply of services...")
                        .relevanceScore(0.87)
                        .chunkIndex(7)
                        .build()
        );
    }

    @Override
    public List<Float> generateEmbedding(String text) {
        List<Float> embedding = new ArrayList<>(768);
        for (int i = 0; i < 768; i++) {
            embedding.add((float) random.nextGaussian());
        }
        return embedding;
    }

    @Override
    public CategorizationResult categorizeTransaction(String description, double amount) {
        String desc = description.toLowerCase();
        String category;
        double confidence;

        if (desc.contains("starbucks") || desc.contains("coffee") || desc.contains("restaurant")
                || desc.contains("lunch") || desc.contains("dinner") || desc.contains("food")) {
            category = "Meals & Entertainment";
            confidence = 0.92 + random.nextDouble() * 0.07;
        } else if (desc.contains("microsoft") || desc.contains("slack") || desc.contains("aws")
                || desc.contains("software") || desc.contains("subscription") || desc.contains("saas")) {
            category = "Software & Subscriptions";
            confidence = 0.90 + random.nextDouble() * 0.09;
        } else if (desc.contains("uber") || desc.contains("lyft") || desc.contains("taxi")
                || desc.contains("fuel") || desc.contains("gas") || desc.contains("parking")) {
            category = "Transportation";
            confidence = 0.88 + random.nextDouble() * 0.11;
        } else if (desc.contains("rent") || desc.contains("electric") || desc.contains("utility")
                || desc.contains("internet") || desc.contains("phone")) {
            category = "Rent & Utilities";
            confidence = 0.93 + random.nextDouble() * 0.06;
        } else if (desc.contains("invoice") || desc.contains("payment") || amount > 0) {
            category = "Revenue";
            confidence = 0.85 + random.nextDouble() * 0.14;
        } else {
            category = "Uncategorized";
            confidence = 0.5 + random.nextDouble() * 0.3;
        }

        return CategorizationResult.builder()
                .categoryName(category)
                .confidenceScore(round(confidence * 100))
                .reasoning("Based on transaction description and merchant analysis")
                .build();
    }

    private String detectVendor(String text) {
        String t = text.toLowerCase();
        if (t.contains("microsoft")) return "Microsoft Corporation";
        if (t.contains("amazon") || t.contains("aws")) return "Amazon Web Services";
        if (t.contains("google")) return "Google LLC";
        if (t.contains("stripe")) return "Stripe Inc.";
        if (t.contains("slack")) return "Slack Technologies";
        if (t.contains("adobe")) return "Adobe Inc.";
        return "Generic Vendor Inc.";
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
