package com.finlyhub.user.service;

import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.user.dto.UpdateUserRequest;
import com.finlyhub.user.dto.UserProfileResponse;
import com.finlyhub.user.entity.User;
import com.finlyhub.user.mapper.UserMapper;
import com.finlyhub.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserProfileResponse getCurrentUserProfile() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return userMapper.toProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse updateCurrentUser(UpdateUserRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        userMapper.updateEntity(user, request);
        user = userRepository.save(user);
        return userMapper.toProfileResponse(user);
    }

    public List<UserProfileResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toProfileResponse)
                .toList();
    }
}
