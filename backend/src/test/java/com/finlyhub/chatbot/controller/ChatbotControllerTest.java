package com.finlyhub.chatbot.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finlyhub.chatbot.dto.ConversationResponse;
import com.finlyhub.chatbot.dto.CreateConversationRequest;
import com.finlyhub.chatbot.dto.MessageResponse;
import com.finlyhub.chatbot.dto.SendMessageRequest;
import com.finlyhub.chatbot.entity.Conversation;
import com.finlyhub.chatbot.service.ChatbotService;
import com.finlyhub.config.JwtTokenProvider;
import com.finlyhub.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChatbotController.class)
@AutoConfigureMockMvc(addFilters = false)
class ChatbotControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ChatbotService chatbotService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void createConversation_Success_ReturnsCreated() throws Exception {
        Conversation conversation = new Conversation();
        conversation.setId(1L);
        conversation.setTitle("Test Chat");
        conversation.setActive(true);
        conversation.setCreatedAt(LocalDateTime.now());
        conversation.setUpdatedAt(LocalDateTime.now());

        when(chatbotService.createConversation(any(), anyString())).thenReturn(conversation);

        CreateConversationRequest request = new CreateConversationRequest("Test Chat");

        mockMvc.perform(post("/api/chat/conversations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Test Chat"));
    }

    @Test
    void createConversation_WithNullTitle_ReturnsCreated() throws Exception {
        Conversation conversation = new Conversation();
        conversation.setId(2L);
        conversation.setActive(true);

        when(chatbotService.createConversation(any(), any())).thenReturn(conversation);

        mockMvc.perform(post("/api/chat/conversations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"New Chat\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getConversations_ReturnsList() throws Exception {
        ConversationResponse response = ConversationResponse.builder()
                .id(1L).title("Chat 1").active(true).messageCount(2).build();

        when(chatbotService.getConversations(any())).thenReturn(List.of(response));

        mockMvc.perform(get("/api/chat/conversations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].title").value("Chat 1"));
    }

    @Test
    void sendMessage_Success_ReturnsOk() throws Exception {
        MessageResponse response = MessageResponse.builder()
                .id(100L)
                .conversationId(1L)
                .role("ASSISTANT")
                .content("Hello back")
                .confidenceScore(0.95)
                .build();

        when(chatbotService.sendMessage(eq(1L), any(), eq("Hello"), isNull())).thenReturn(response);

        SendMessageRequest request = SendMessageRequest.builder().message("Hello").build();

        mockMvc.perform(post("/api/chat/conversations/1/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").value("Hello back"));
    }

    @Test
    void sendMessage_EmptyMessage_ReturnsBadRequest() throws Exception {
        SendMessageRequest request = SendMessageRequest.builder().message("").build();

        mockMvc.perform(post("/api/chat/conversations/1/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getMessages_ReturnsList() throws Exception {
        MessageResponse response = MessageResponse.builder()
                .id(100L).conversationId(1L).role("USER").content("Hi").build();

        when(chatbotService.getMessages(1L)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/chat/conversations/1/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].content").value("Hi"));
    }

    @Test
    void deleteConversation_ReturnsOk() throws Exception {
        mockMvc.perform(delete("/api/chat/conversations/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Conversation deleted"));
    }
}
