package com.finlyhub.user.controller;

import com.finlyhub.common.dto.ApiResponse;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.user.dto.UpdateUserRequest;
import com.finlyhub.user.dto.UserProfileResponse;
import com.finlyhub.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUser() {
        UserProfileResponse profile = userService.getCurrentUserProfile();
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateCurrentUser(
            @Valid @RequestBody UpdateUserRequest request) {
        UserProfileResponse profile = userService.updateCurrentUser(request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated", profile));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> getAllUsers() {
        List<UserProfileResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }
}
