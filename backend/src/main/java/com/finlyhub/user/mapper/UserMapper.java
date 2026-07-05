package com.finlyhub.user.mapper;

import com.finlyhub.user.dto.UpdateUserRequest;
import com.finlyhub.user.dto.UserProfileResponse;
import com.finlyhub.user.entity.Role;
import com.finlyhub.user.entity.User;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class UserMapper {

    public UserProfileResponse toProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .company(user.getCompany())
                .avatarUrl(user.getAvatarUrl())
                .emailVerified(user.isEmailVerified())
                .roles(user.getRoles().stream()
                        .map(Role::getName)
                        .collect(Collectors.toSet()))
                .createdAt(user.getCreatedAt())
                .build();
    }

    public void updateEntity(User user, UpdateUserRequest request) {
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getCompany() != null) {
            user.setCompany(request.getCompany());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
    }
}
