package com.finlyhub.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private Long id;
    private Long conversationId;
    private String role;
    private String content;
    private List<SourceDto> sources;
    private Double confidenceScore;
    private LocalDateTime createdAt;
}
