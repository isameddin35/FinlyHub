package com.finlyhub.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {

    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @Size(max = 255)
    private String company;

    @Size(max = 500)
    private String avatarUrl;
}
