package com.finlyhub.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityItem {

    private Long id;
    private String type;
    private String title;
    private String description;
    private LocalDateTime timestamp;
}
