package com.finlyhub.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finlyhub.chatbot.service.ChatbotService;
import com.finlyhub.common.model.SourceDocument;
import com.finlyhub.document.service.DemoEmbeddingReindexer;
import com.finlyhub.user.entity.User;
import com.finlyhub.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("demo")
@EnabledIfEnvironmentVariable(named = "RUN_RAG_EVAL", matches = "true")
class RagEvalIntegrationTest {

    @Autowired
    private ChatbotService chatbotService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private DemoEmbeddingReindexer reindexer;
    @Autowired
    private ObjectMapper objectMapper;

    private Map<String, Long> userIds = new HashMap<>();

    @Test
    void retrieval_PrecisionExceedsThreshold_ForGoldenSet() throws Exception {
        reindexer.run(null);

        List<Map<String, Object>> questions = loadQuestions();

        int hits = 0;
        int total = 0;
        StringBuilder report = new StringBuilder("RAG retrieval eval report:\n");

        for (Map<String, Object> question : questions) {
            String userKey = (String) question.get("user");
            String text = (String) question.get("question");
            Long userId = userIdFor(userKey);
            List<SourceDocument> sources = chatbotService.retrieveSources(userId, text);

            boolean matched = sources.stream().anyMatch(s -> matches(s, question.get("expected")));
            if (!matched && question.get("alternate") != null) {
                matched = sources.stream().anyMatch(s -> matches(s, question.get("alternate")));
            }

            total++;
            if (matched) hits++;
            report.append(String.format("  [%s] %s%n", matched ? "HIT " : "MISS", text));
            sources.stream().limit(3)
                    .forEach(s -> report.append(String.format("       -> %s (chunk %s, %.2f)%n",
                            s.getFilename(), s.getChunkIndex(), s.getRelevanceScore())));
        }

        double precision = total > 0 ? (double) hits / total : 0.0;
        report.append(String.format("precision@k: %.2f (%d/%d), threshold: %.2f%n",
                precision, hits, total, 0.7));
        System.out.println(report);

        assertThat(precision).as("retrieval precision@k below threshold\n" + report)
                .isGreaterThanOrEqualTo(0.7);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> loadQuestions() throws Exception {
        try (InputStream is = getClass().getResourceAsStream("/rag-eval/retrieval_eval_set.json")) {
            Map<String, Object> root = objectMapper.readValue(is, Map.class);
            return (List<Map<String, Object>>) root.get("questions");
        }
    }

    private boolean matches(SourceDocument source, Object expectedRaw) {
        if (!(expectedRaw instanceof List)) return false;
        for (Object item : (List<Object>) expectedRaw) {
            Map<String, Object> expected = (Map<String, Object>) item;
            String filename = (String) expected.get("filename");
            int chunkIndex = ((Number) expected.get("chunkIndex")).intValue();
            if (filename.equals(source.getFilename()) && chunkIndex == source.getChunkIndex()) {
                return true;
            }
        }
        return false;
    }

    private Long userIdFor(String key) {
        return userIds.computeIfAbsent(key, k -> {
            String email = switch (k) {
                case "admin" -> "admin@finlyhub.com";
                case "accountant" -> "accountant@finlyhub.com";
                case "viewer" -> "viewer@finlyhub.com";
                default -> throw new IllegalArgumentException("Unknown user: " + k);
            };
            return userRepository.findByEmail(email).map(User::getId).orElseThrow();
        });
    }
}
