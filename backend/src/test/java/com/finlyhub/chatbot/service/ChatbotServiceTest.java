package com.finlyhub.chatbot.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finlyhub.chatbot.dto.MessageResponse;
import com.finlyhub.chatbot.dto.ConversationResponse;
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
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatbotServiceTest {

    @Mock private ConversationRepository conversationRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private AiService aiService;
    @Mock private ObjectMapper objectMapper;
    @Mock private EntityManager entityManager;

    private ChatbotService chatbotService;

    private User user;
    private Conversation conversation;

    @BeforeEach
    void setUp() {
        chatbotService = new ChatbotService(conversationRepository, messageRepository, aiService, objectMapper);
        ReflectionTestUtils.setField(chatbotService, "entityManager", entityManager);

        user = new User();
        user.setId(1L);

        conversation = new Conversation();
        conversation.setId(10L);
        conversation.setUser(user);
        conversation.setTitle("Test Conversation");
        conversation.setActive(true);
        conversation.setCreatedAt(LocalDateTime.now());
        conversation.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    void createConversation_Success_CreatesAndReturns() {
        when(entityManager.getReference(User.class, 1L)).thenReturn(user);
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(i -> i.getArgument(0));

        Conversation result = chatbotService.createConversation(1L, "My Chat");

        assertThat(result.getTitle()).isEqualTo("My Chat");
        assertThat(result.isActive()).isTrue();
    }

    @Test
    void createConversation_WithNullTitle_UsesDefault() {
        when(entityManager.getReference(User.class, 1L)).thenReturn(user);
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(i -> i.getArgument(0));

        Conversation result = chatbotService.createConversation(1L, null);

        assertThat(result.getTitle()).isEqualTo("New Conversation");
    }

    @Test
    void sendMessage_Success_ReturnsMessageResponse() {
        Query mockQuery = mock(Query.class);
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(aiService.generateEmbedding(anyString())).thenReturn(List.of(0.1f, 0.2f, 0.3f));
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(List.of());
        when(messageRepository.findByConversationIdOrderByCreatedAtAsc(10L)).thenReturn(List.of());
        when(aiService.chat(any(ChatRequest.class))).thenReturn(
                ChatResponse.builder().message("Hi there!").confidenceScore(0.95).build());
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> i.getArgument(0));

        MessageResponse result = chatbotService.sendMessage(10L, 1L, "Hello");

        assertThat(result.getContent()).isEqualTo("Hi there!");
        assertThat(result.getConfidenceScore()).isEqualTo(0.95);
    }

    @Test
    void sendMessage_WithSources_IncludesSourcesInResponse() {
        SourceDocument source = SourceDocument.builder()
                .documentId(5L).filename("test.pdf").excerpt("Content").chunkIndex(3).build();
        Object[] row = new Object[]{1L, 5L, 3, "Content", "test.pdf", 0.85};
        Query mockQuery = mock(Query.class);

        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(aiService.generateEmbedding(anyString())).thenReturn(List.of(0.1f, 0.2f, 0.3f));
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(List.of((Object) row));
        when(messageRepository.findByConversationIdOrderByCreatedAtAsc(10L)).thenReturn(List.of());
        when(aiService.chat(any(ChatRequest.class))).thenReturn(
                ChatResponse.builder().message("Found in doc").confidenceScore(0.85)
                        .sources(List.of(source)).build());
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> i.getArgument(0));

        MessageResponse result = chatbotService.sendMessage(10L, 1L, "Test");

        assertThat(result.getContent()).isEqualTo("Found in doc");
    }

    @Test
    void sendMessage_ConversationNotFound_ThrowsResourceNotFoundException() {
        when(conversationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatbotService.sendMessage(999L, 1L, "Hi"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void sendMessage_UserIdMismatch_ThrowsResourceNotFoundException() {
        User otherUser = new User();
        otherUser.setId(2L);
        conversation.setUser(otherUser);

        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> chatbotService.sendMessage(10L, 1L, "Hi"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("10");
    }

    @Test
    void getConversations_ReturnsList() {
        when(conversationRepository.findByUserIdAndActiveTrue(1L)).thenReturn(List.of(conversation));
        when(messageRepository.findByConversationIdOrderByCreatedAtAsc(10L)).thenReturn(List.of());

        List<ConversationResponse> result = chatbotService.getConversations(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("Test Conversation");
    }

    @Test
    void getMessages_ReturnsMessagesForSameUser() {
        try (var securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));

            Message userMsg = new Message();
            userMsg.setId(1L);
            userMsg.setConversation(conversation);
            userMsg.setRole(Message.Role.USER);
            userMsg.setContent("Hi");

            Message asstMsg = new Message();
            asstMsg.setId(2L);
            asstMsg.setConversation(conversation);
            asstMsg.setRole(Message.Role.ASSISTANT);
            asstMsg.setContent("Hello");
            asstMsg.setConfidenceScore(0.9);

            when(messageRepository.findByConversationIdOrderByCreatedAtAsc(10L))
                    .thenReturn(List.of(userMsg, asstMsg));

            List<MessageResponse> result = chatbotService.getMessages(10L);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).getRole()).isEqualTo("USER");
            assertThat(result.get(1).getRole()).isEqualTo("ASSISTANT");
        }
    }

    @Test
    void deleteConversation_SoftDeletesConversation() {
        try (var securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
            when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));

            chatbotService.deleteConversation(10L);

            assertThat(conversation.isActive()).isFalse();
            verify(conversationRepository).save(conversation);
        }
    }

    @Test
    void streamMessage_ReturnsSseEmitter() {
        Query mockQuery = mock(Query.class);
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(aiService.generateEmbedding(anyString())).thenReturn(List.of(0.1f, 0.2f, 0.3f));
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(List.of());
        when(messageRepository.findByConversationIdOrderByCreatedAtAsc(10L)).thenReturn(List.of());
        when(messageRepository.save(any(Message.class))).thenReturn(new Message());

        SseEmitter emitter = chatbotService.streamMessage(10L, 1L, "Hello");

        assertThat(emitter).isNotNull();
        assertThat(emitter.getTimeout()).isEqualTo(300000L);
    }

    @Test
    void sendMessage_UpdatesTitleForDefaultConversation() {
        conversation.setTitle("New Conversation");
        Query mockQuery = mock(Query.class);

        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(aiService.generateEmbedding(anyString())).thenReturn(List.of(0.1f, 0.2f, 0.3f));
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.setParameter(anyString(), any())).thenReturn(mockQuery);
        when(mockQuery.getResultList()).thenReturn(List.of());
        when(messageRepository.findByConversationIdOrderByCreatedAtAsc(10L)).thenReturn(List.of());
        when(aiService.chat(any(ChatRequest.class))).thenReturn(
                ChatResponse.builder().message("Response").confidenceScore(0.9).build());
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> i.getArgument(0));

        chatbotService.sendMessage(10L, 1L, "This is a very long test message about Azerbaijani tax code regulations");

        assertThat(conversation.getTitle()).isEqualTo("This is a very long test message about Azerbaijani...");
    }
}
