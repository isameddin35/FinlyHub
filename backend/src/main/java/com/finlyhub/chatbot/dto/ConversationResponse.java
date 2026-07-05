package com.finlyhub.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationResponse {
    private Long id;
    private String title;
    private boolean active;
    private String lastMessage;
    private int messageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
