package com.finlyhub.chatbot.controller;

import com.finlyhub.chatbot.dto.ConversationResponse;
import com.finlyhub.chatbot.dto.CreateConversationRequest;
import com.finlyhub.chatbot.dto.MessageResponse;
import com.finlyhub.chatbot.dto.SendMessageRequest;
import com.finlyhub.chatbot.entity.Conversation;
import com.finlyhub.chatbot.service.ChatbotService;
import com.finlyhub.common.dto.ApiResponse;
import com.finlyhub.common.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/conversations")
    public ResponseEntity<ApiResponse<ConversationResponse>> createConversation(
            @Valid @RequestBody CreateConversationRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        Conversation conversation = chatbotService.createConversation(userId, request.getTitle());
        ConversationResponse response = ConversationResponse.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .active(conversation.isActive())
                .messageCount(0)
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Conversation created", response));
    }

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ConversationResponse>>> getConversations() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<ConversationResponse> conversations = chatbotService.getConversations(userId);
        return ResponseEntity.ok(ApiResponse.success(conversations));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<MessageResponse>> sendMessage(
            @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        MessageResponse response = chatbotService.sendMessage(id, userId, request.getMessage());
        return ResponseEntity.ok(ApiResponse.success("Message sent", response));
    }

    @PostMapping(value = "/conversations/{id}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMessage(
            @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return chatbotService.streamMessage(id, userId, request.getMessage());
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<List<MessageResponse>>> getMessages(@PathVariable Long id) {
        List<MessageResponse> messages = chatbotService.getMessages(id);
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteConversation(@PathVariable Long id) {
        chatbotService.deleteConversation(id);
        return ResponseEntity.ok(ApiResponse.success("Conversation deleted", null));
    }
}
