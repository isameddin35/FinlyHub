package com.finlyhub.chatbot.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finlyhub.chatbot.dto.ConversationResponse;
import com.finlyhub.chatbot.dto.MessageResponse;
import com.finlyhub.chatbot.dto.SourceDto;
import com.finlyhub.chatbot.entity.Conversation;
import com.finlyhub.chatbot.entity.Message;
import com.finlyhub.chatbot.repository.ConversationRepository;
import com.finlyhub.chatbot.repository.MessageRepository;
import com.finlyhub.common.exception.BusinessException;
import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.model.ChatRequest;
import com.finlyhub.common.model.ChatResponse;
import com.finlyhub.common.model.SourceDocument;
import com.finlyhub.common.service.AiService;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.user.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private static final String BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";
    private static final int RETRIEVAL_TOP_K = 5;
    private static final int RERANK_CANDIDATES = 15;
    private static final double RRF_K = 60.0;

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Value("${ai.retrieval.min-similarity:0.4}")
    private double minSimilarity;

    @Value("${ai.retrieval.mmr-lambda:0.7}")
    private double mmrLambda;

    @PersistenceContext
    private EntityManager entityManager;

    public Conversation createConversation(Long userId, String title) {
        Conversation conversation = new Conversation();
        conversation.setUser(entityManager.getReference(User.class, userId));
        conversation.setTitle(title != null ? title : "New Conversation");
        conversation.setActive(true);
        return conversationRepository.save(conversation);
    }

    public MessageResponse sendMessage(Long conversationId, Long userId, String message) {
        return sendMessage(conversationId, userId, message, null);
    }

    public MessageResponse sendMessage(Long conversationId, Long userId, String message, RetrievalFilter filter) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));

        if (!conversation.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Conversation", conversationId);
        }

        Message userMessage = new Message();
        userMessage.setConversation(conversation);
        userMessage.setRole(Message.Role.USER);
        userMessage.setContent(message);

        List<SourceDocument> relevantDocs = searchRelevantDocuments(userId, message, filter);

        List<Message> history = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        List<String> historyStrings = history.stream()
                .map(m -> m.getRole().name() + ": " + m.getContent())
                .collect(Collectors.toList());

        ChatRequest chatRequest = ChatRequest.builder()
                .message(message)
                .conversationHistory(historyStrings)
                .relevantDocuments(relevantDocs)
                .build();

        messageRepository.save(userMessage);

        ChatResponse chatResponse = aiService.chat(chatRequest);

        Message assistantMessage = new Message();
        assistantMessage.setConversation(conversation);
        assistantMessage.setRole(Message.Role.ASSISTANT);
        assistantMessage.setContent(chatResponse.getMessage());
        assistantMessage.setConfidenceScore(chatResponse.getConfidenceScore());

        if (chatResponse.getSources() != null && !chatResponse.getSources().isEmpty()) {
            try {
                assistantMessage.setSources(objectMapper.writeValueAsString(chatResponse.getSources()));
            } catch (Exception e) {
                log.warn("Failed to serialize sources", e);
            }
        }

        messageRepository.save(assistantMessage);

        if (conversation.getTitle() == null || conversation.getTitle().equals("New Conversation")) {
            String title = message.length() > 50 ? message.substring(0, 50) + "..." : message;
            conversation.setTitle(title);
            conversationRepository.save(conversation);
        }

        return buildMessageResponse(assistantMessage);
    }

    public SseEmitter streamMessage(Long conversationId, Long userId, String message) {
        return streamMessage(conversationId, userId, message, null);
    }

    public SseEmitter streamMessage(Long conversationId, Long userId, String message, RetrievalFilter filter) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));

        if (!conversation.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Conversation", conversationId);
        }

        Message userMessage = new Message();
        userMessage.setConversation(conversation);
        userMessage.setRole(Message.Role.USER);
        userMessage.setContent(message);

        List<SourceDocument> relevantDocs = searchRelevantDocuments(userId, message, filter);

        List<Message> history = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        List<String> historyStrings = history.stream()
                .map(m -> m.getRole().name() + ": " + m.getContent())
                .collect(Collectors.toList());

        ChatRequest chatRequest = ChatRequest.builder()
                .message(message)
                .conversationHistory(historyStrings)
                .relevantDocuments(relevantDocs)
                .build();

        messageRepository.save(userMessage);

        SseEmitter emitter = new SseEmitter(300000L);

        CompletableFuture.runAsync(() -> {
            try {
                StringBuilder fullContent = new StringBuilder();

                aiService.streamChat(chatRequest,
                    token -> {
                        fullContent.append(token);
                        try {
                            emitter.send(SseEmitter.event().name("token").data(token));
                        } catch (Exception e) {
                            throw new BusinessException("SSE send failed");
                        }
                    },
                    () -> {
                        Message assistantMessage = new Message();
                        assistantMessage.setConversation(conversation);
                        assistantMessage.setRole(Message.Role.ASSISTANT);
                        assistantMessage.setContent(fullContent.toString());
                        assistantMessage.setConfidenceScore(0.85);

                        if (!relevantDocs.isEmpty()) {
                            try {
                                assistantMessage.setSources(objectMapper.writeValueAsString(relevantDocs));
                            } catch (Exception e) {
                                log.warn("Failed to serialize sources", e);
                            }
                        }

                        messageRepository.save(assistantMessage);

                        if (conversation.getTitle() == null || conversation.getTitle().equals("New Conversation")) {
                            String title = message.length() > 50 ? message.substring(0, 50) + "..." : message;
                            conversation.setTitle(title);
                            conversationRepository.save(conversation);
                        }

                        MessageResponse response = buildMessageResponse(assistantMessage);
                        try {
                            emitter.send(SseEmitter.event().name("done").data(objectMapper.writeValueAsString(response)));
                        } catch (Exception e) {
                            log.warn("Failed to send done event", e);
                        }
                        emitter.complete();
                    }
                );
            } catch (Exception e) {
                log.error("Stream processing failed", e);
                try {
                    emitter.completeWithError(e);
                } catch (Exception ignored) {}
            }
        });

        return emitter;
    }

    public List<SourceDocument> retrieveSources(Long userId, String query) {
        return searchRelevantDocuments(userId, query, null);
    }

    private List<SourceDocument> searchRelevantDocuments(Long userId, String query, RetrievalFilter filter) {
        try {
            List<Object[]> vectorResults = vectorSearch(userId, query, filter);
            List<Object[]> keywordResults = keywordSearch(userId, query, filter);

            if (vectorResults.isEmpty() && keywordResults.isEmpty()) {
                return List.of();
            }

            Map<Long, RankedChunk> ranked = new LinkedHashMap<>();
            accumulateRanked(vectorResults, ranked);
            accumulateRanked(keywordResults, ranked);

            List<RankedChunk> candidates = ranked.values().stream()
                    .sorted(Comparator.comparingDouble(RankedChunk::getRrfScore).reversed())
                    .limit(RERANK_CANDIDATES)
                    .collect(Collectors.toList());

            return rerankWithMmr(candidates).stream()
                    .map(RankedChunk::toSource)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Vector search failed, returning empty results", e);
            return List.of();
        }
    }

    private List<RankedChunk> rerankWithMmr(List<RankedChunk> candidates) {
        if (candidates.isEmpty()) {
            return candidates;
        }

        double maxRrf = candidates.stream()
                .mapToDouble(RankedChunk::getRrfScore)
                .max()
                .orElse(1.0);

        List<RankedChunk> selected = new ArrayList<>();
        List<RankedChunk> remaining = new ArrayList<>(candidates);

        while (selected.size() < RETRIEVAL_TOP_K && !remaining.isEmpty()) {
            RankedChunk best = null;
            double bestScore = Double.NEGATIVE_INFINITY;

            for (RankedChunk candidate : remaining) {
                double relevance = maxRrf > 0 ? candidate.getRrfScore() / maxRrf : 0.0;
                double diversity = 0.0;
                if (candidate.getEmbedding() != null) {
                    for (RankedChunk picked : selected) {
                        if (picked.getEmbedding() != null) {
                            diversity = Math.max(diversity, cosineSimilarity(candidate.getEmbedding(), picked.getEmbedding()));
                        }
                    }
                }
                double score = mmrLambda * relevance - (1.0 - mmrLambda) * diversity;
                if (score > bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            }

            selected.add(best);
            remaining.remove(best);
        }

        return selected;
    }

    private static double cosineSimilarity(float[] a, float[] b) {
        int len = Math.min(a.length, b.length);
        double dot = 0.0, normA = 0.0, normB = 0.0;
        for (int i = 0; i < len; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private List<Object[]> vectorSearch(Long userId, String query, RetrievalFilter filter) {
        try {
            List<Float> embedding = aiService.generateEmbedding(BGE_QUERY_PREFIX + query);
            if (embedding == null || embedding.isEmpty()) {
                return List.of();
            }

            String embeddingStr = embedding.stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(",", "[", "]"));

            double maxDistance = 1.0 - minSimilarity;

            String sql = "SELECT c.id, c.document_id, c.chunk_index, c.content, c.filename, "
                       + "1 - (c.embedding <=> cast(:embedding as vector)) AS similarity, c.embedding "
                       + "FROM document_chunks c "
                       + "JOIN documents d ON c.document_id = d.id "
                       + "WHERE d.user_id = :userId "
                       + "AND c.embedding IS NOT NULL "
                       + "AND (c.embedding <=> cast(:embedding as vector)) <= :maxDistance "
                       + filterClause(filter)
                       + " ORDER BY c.embedding <=> cast(:embedding as vector) LIMIT " + RERANK_CANDIDATES;

            Query queryObj = entityManager.createNativeQuery(sql)
                    .setParameter("embedding", embeddingStr)
                    .setParameter("userId", userId)
                    .setParameter("maxDistance", maxDistance);
            applyFilterParams(queryObj, filter);

            return queryObj.getResultList();
        } catch (Exception e) {
            log.warn("Vector search query failed", e);
            return List.of();
        }
    }

    private List<Object[]> keywordSearch(Long userId, String query, RetrievalFilter filter) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        try {
            String tsQuery = "SELECT c.id, c.document_id, c.chunk_index, c.content, c.filename, "
                           + "ts_rank(c.search_vector, websearch_to_tsquery(:query)) AS similarity, c.embedding "
                           + "FROM document_chunks c "
                           + "JOIN documents d ON c.document_id = d.id "
                           + "WHERE d.user_id = :userId "
                           + "AND c.search_vector @@ websearch_to_tsquery(:query) "
                           + filterClause(filter)
                           + " ORDER BY similarity DESC LIMIT " + RERANK_CANDIDATES;

            Query queryObj = entityManager.createNativeQuery(tsQuery)
                    .setParameter("userId", userId)
                    .setParameter("query", query);
            applyFilterParams(queryObj, filter);

            return queryObj.getResultList();
        } catch (Exception e) {
            log.warn("Keyword search query failed", e);
            return List.of();
        }
    }

    private String filterClause(RetrievalFilter filter) {
        if (filter == null) {
            return "";
        }
        StringBuilder clause = new StringBuilder();
        if (filter.documentType() != null) {
            clause.append(" AND d.document_type = :documentType");
        }
        if (filter.fromDate() != null) {
            clause.append(" AND d.created_at >= :fromDate");
        }
        if (filter.toDate() != null) {
            clause.append(" AND d.created_at <= :toDate");
        }
        return clause.toString();
    }

    private void applyFilterParams(Query queryObj, RetrievalFilter filter) {
        if (filter == null) {
            return;
        }
        if (filter.documentType() != null) {
            queryObj.setParameter("documentType", filter.documentType());
        }
        if (filter.fromDate() != null) {
            queryObj.setParameter("fromDate", filter.fromDate().atStartOfDay());
        }
        if (filter.toDate() != null) {
            queryObj.setParameter("toDate", filter.toDate().atTime(23, 59, 59));
        }
    }

    private void accumulateRanked(List<Object[]> rows, Map<Long, RankedChunk> ranked) {
        for (int i = 0; i < rows.size(); i++) {
            Object[] row = rows.get(i);
            Long chunkId = ((Number) row[0]).longValue();
            RankedChunk hit = ranked.computeIfAbsent(chunkId, k -> new RankedChunk(row));
            hit.addScore(i, row);
        }
    }

    private static class RankedChunk {
        private final Long documentId;
        private final Integer chunkIndex;
        private final String content;
        private final String filename;
        private final float[] embedding;
        private double similarity = 0.0;
        private double rrfScore = 0.0;

        RankedChunk(Object[] row) {
            this.documentId = row[1] != null ? ((Number) row[1]).longValue() : null;
            this.chunkIndex = row[2] != null ? ((Number) row[2]).intValue() : null;
            this.content = row[3] != null ? (String) row[3] : null;
            this.filename = row[4] != null ? (String) row[4] : null;
            this.embedding = row.length > 6 && row[6] != null ? parseEmbedding(row[6]) : null;
        }

        void addScore(int rank, Object[] row) {
            this.rrfScore += 1.0 / (RRF_K + rank);
            if (row[5] != null) {
                double score = ((Number) row[5]).doubleValue();
                this.similarity = Math.max(this.similarity, score);
            }
        }

        double getRrfScore() {
            return rrfScore;
        }

        float[] getEmbedding() {
            return embedding;
        }

        SourceDocument toSource() {
            return SourceDocument.builder()
                    .documentId(documentId)
                    .chunkIndex(chunkIndex)
                    .excerpt(truncateExcerpt(content))
                    .filename(filename)
                    .relevanceScore(similarity)
                    .build();
        }
    }

    private static float[] parseEmbedding(Object raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.toString();
        if (value.isBlank() || value.startsWith("{")) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.startsWith("[")) {
            trimmed = trimmed.substring(1);
        }
        if (trimmed.endsWith("]")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        String[] parts = trimmed.split(",");
        float[] result = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            result[i] = Float.parseFloat(parts[i].trim());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> getConversations(Long userId) {
        List<Conversation> conversations = conversationRepository.findByUserIdAndActiveTrue(userId);
        return conversations.stream()
                .map(this::buildConversationResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));

        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (!conversation.getUser().getId().equals(currentUserId)) {
            throw new ResourceNotFoundException("Conversation", conversationId);
        }

        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        return messages.stream()
                .map(this::buildMessageResponse)
                .collect(Collectors.toList());
    }

    public void deleteConversation(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));

        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (!conversation.getUser().getId().equals(currentUserId)) {
            throw new ResourceNotFoundException("Conversation", conversationId);
        }

        conversation.setActive(false);
        conversationRepository.save(conversation);
    }

    private ConversationResponse buildConversationResponse(Conversation conversation) {
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        String lastMessage = null;
        if (!messages.isEmpty()) {
            String content = messages.get(messages.size() - 1).getContent();
            lastMessage = content.length() > 100 ? content.substring(0, 100) + "..." : content;
        }

        return ConversationResponse.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .active(conversation.isActive())
                .lastMessage(lastMessage)
                .messageCount(messages.size())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
    }

    private MessageResponse buildMessageResponse(Message message) {
        List<SourceDto> sourceDtos = new ArrayList<>();
        if (message.getSources() != null && !message.getSources().isBlank()) {
            try {
                List<SourceDocument> sourceDocuments = objectMapper.readValue(
                        message.getSources(),
                        new TypeReference<List<SourceDocument>>() {}
                );
                sourceDtos = sourceDocuments.stream()
                        .map(s -> SourceDto.builder()
                                .documentId(s.getDocumentId())
                                .filename(s.getFilename())
                                .excerpt(truncateExcerpt(s.getExcerpt()))
                                .relevanceScore(s.getRelevanceScore())
                                .chunkIndex(s.getChunkIndex())
                                .build())
                        .collect(Collectors.toList());
            } catch (Exception e) {
                log.warn("Failed to deserialize sources", e);
            }
        }

        return MessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .role(message.getRole().name())
                .content(message.getContent())
                .sources(sourceDtos)
                .confidenceScore(message.getConfidenceScore())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private static String truncateExcerpt(String excerpt) {
        if (excerpt != null && excerpt.length() > 150) {
            return excerpt.substring(0, 150) + "...";
        }
        return excerpt;
    }
}
