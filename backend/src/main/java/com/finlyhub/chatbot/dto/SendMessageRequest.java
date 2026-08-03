package com.finlyhub.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    @NotBlank(message = "Message is required")
    private String message;

    private String documentType;

    private LocalDate fromDate;

    private LocalDate toDate;
}
