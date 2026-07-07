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
import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.model.ChatRequest;
import com.finlyhub.common.model.ChatResponse;
import com.finlyhub.common.model.SourceDocument;
import com.finlyhub.common.service.AiService;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.user.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

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
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));

        if (!conversation.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Conversation", conversationId);
        }

        Message userMessage = new Message();
        userMessage.setConversation(conversation);
        userMessage.setRole(Message.Role.USER);
        userMessage.setContent(message);

        List<SourceDocument> relevantDocs = searchRelevantDocuments(message);

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
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", conversationId));

        if (!conversation.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Conversation", conversationId);
        }

        Message userMessage = new Message();
        userMessage.setConversation(conversation);
        userMessage.setRole(Message.Role.USER);
        userMessage.setContent(message);

        List<SourceDocument> relevantDocs = searchRelevantDocuments(message);

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
                            throw new RuntimeException("SSE send failed", e);
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

    private List<SourceDocument> searchRelevantDocuments(String query) {
        try {
            List<Float> embedding = aiService.generateEmbedding(query);
            if (embedding == null || embedding.isEmpty()) {
                return List.of();
            }

            String embeddingStr = embedding.stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(",", "[", "]"));

            String sql = "SELECT id, document_id, chunk_index, content, filename, 1 - (embedding <=> cast(:embedding as vector)) AS similarity FROM document_chunks ORDER BY embedding <=> cast(:embedding as vector) LIMIT 5";

            List<Object[]> results = entityManager.createNativeQuery(sql)
                    .setParameter("embedding", embeddingStr)
                    .getResultList();

            List<SourceDocument> docs = new ArrayList<>();
            for (Object[] row : results) {
                SourceDocument doc = SourceDocument.builder()
                        .documentId(row[1] != null ? ((Number) row[1]).longValue() : null)
                        .chunkIndex(row[2] != null ? ((Number) row[2]).intValue() : null)
                        .excerpt(row[3] != null ? (String) row[3] : null)
                        .filename(row[4] != null ? (String) row[4] : null)
                        .relevanceScore(row[5] != null ? ((Number) row[5]).doubleValue() : null)
                        .build();
                docs.add(doc);
            }
            return docs;
        } catch (Exception e) {
            log.warn("Vector search failed, returning empty results", e);
            return List.of();
        }
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
                                .excerpt(s.getExcerpt())
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
}
