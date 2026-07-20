package com.finlyhub.auth.service;

import com.finlyhub.auth.dto.AuthResponse;
import com.finlyhub.auth.dto.LoginRequest;
import com.finlyhub.auth.dto.RefreshTokenRequest;
import com.finlyhub.auth.dto.RegisterRequest;
import com.finlyhub.common.exception.BusinessException;
import com.finlyhub.common.exception.DuplicateResourceException;
import com.finlyhub.config.JwtTokenProvider;
import com.finlyhub.user.dto.UserProfileResponse;
import com.finlyhub.user.entity.Role;
import com.finlyhub.user.entity.User;
import com.finlyhub.user.mapper.UserMapper;
import com.finlyhub.user.repository.RoleRepository;
import com.finlyhub.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserMapper userMapper;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setCompany(request.getCompany());

        Role role = roleRepository.findByName("VIEWER")
                .orElseThrow(() -> new BusinessException("VIEWER role not found"));
        user.setRoles(Set.of(role));

        user = userRepository.save(user);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("User not found"));

        return buildAuthResponse(user);
    }

    public AuthResponse refresh(RefreshTokenRequest request) {
        if (!jwtTokenProvider.validateToken(request.getRefreshToken())) {
            throw new BusinessException("Invalid or expired refresh token");
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(request.getRefreshToken());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found"));

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .toList();

        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(), user.getEmail(), roles);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        UserProfileResponse userProfile = userMapper.toProfileResponse(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .user(userProfile)
                .build();
    }
}
