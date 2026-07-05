package com.finlyhub.config;

import com.finlyhub.common.service.AiService;
import com.finlyhub.common.service.MockAiService;
import com.finlyhub.common.service.OpenAiAiService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenAiConfig {

    @Value("${ai.openai.base-url}")
    private String baseUrl;

    @Value("${ai.openai.api-key}")
    private String apiKey;

    @Value("${ai.openai.model}")
    private String model;

    @Value("${ai.openai.embedding-model}")
    private String embeddingModel;

    @Bean
    @ConditionalOnProperty(name = "ai.provider", havingValue = "openai")
    public AiService openAiService() {
        return new OpenAiAiService(baseUrl, apiKey, model, embeddingModel);
    }

    @Bean
    @ConditionalOnProperty(name = "ai.provider", havingValue = "mock", matchIfMissing = true)
    public AiService mockAiService() {
        return new MockAiService();
    }
}
