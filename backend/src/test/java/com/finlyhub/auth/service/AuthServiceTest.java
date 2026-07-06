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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private UserMapper userMapper;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, roleRepository, passwordEncoder,
                authenticationManager, jwtTokenProvider, userMapper);
    }

    @Test
    void register_Success_CreatesUserAndReturnsAuthResponse() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setCompany("Acme");

        Role viewerRole = new Role("VIEWER");
        viewerRole.setId(1L);

        User savedUser = createUser(1L, "test@example.com", "encoded", "John", "Doe", "Acme", Set.of(viewerRole));

        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(roleRepository.findByName("VIEWER")).thenReturn(Optional.of(viewerRole));
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtTokenProvider.generateAccessToken(1L, "test@example.com", List.of("VIEWER")))
                .thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(1L)).thenReturn("refresh-token");
        when(userMapper.toProfileResponse(savedUser))
                .thenReturn(createProfile(savedUser));

        AuthResponse response = authService.register(request);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getUser().getEmail()).isEqualTo("test@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_DuplicateEmail_ThrowsDuplicateResourceException() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@example.com");
        request.setPassword("password123");

        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("existing@example.com");
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_WithAccountantRole_AssignsAccountantRole() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("accountant@example.com");
        request.setPassword("password123");
        request.setFirstName("Jane");
        request.setLastName("Smith");
        request.setRole("ACCOUNTANT");

        Role accountantRole = new Role("ACCOUNTANT");
        accountantRole.setId(2L);

        User savedUser = createUser(2L, "accountant@example.com", "encoded", "Jane", "Smith", null, Set.of(accountantRole));

        when(userRepository.existsByEmail("accountant@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(roleRepository.findByName("ACCOUNTANT")).thenReturn(Optional.of(accountantRole));
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtTokenProvider.generateAccessToken(anyLong(), anyString(), anyList())).thenReturn("token");
        when(jwtTokenProvider.generateRefreshToken(anyLong())).thenReturn("rtoken");
        when(userMapper.toProfileResponse(any())).thenReturn(createProfile(savedUser));

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        verify(roleRepository).findByName("ACCOUNTANT");
    }

    @Test
    void register_WithoutRole_DefaultsToViewer() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("viewer@example.com");
        request.setPassword("password123");
        request.setFirstName("Sam");
        request.setLastName("Wilson");

        Role viewerRole = new Role("VIEWER");
        viewerRole.setId(1L);

        User savedUser = createUser(1L, "viewer@example.com", "encoded", "Sam", "Wilson", null, Set.of(viewerRole));

        when(userRepository.existsByEmail("viewer@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(roleRepository.findByName("VIEWER")).thenReturn(Optional.of(viewerRole));
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtTokenProvider.generateAccessToken(1L, "viewer@example.com", List.of("VIEWER"))).thenReturn("token");
        when(jwtTokenProvider.generateRefreshToken(1L)).thenReturn("rtoken");
        when(userMapper.toProfileResponse(savedUser)).thenReturn(new UserProfileResponse());

        authService.register(request);

        verify(roleRepository).findByName("VIEWER");
    }

    @Test
    void login_Success_ReturnsAuthResponse() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");

        User user = createUser(1L, "test@example.com", "encoded", "John", "Doe", null, Set.of(new Role("VIEWER")));

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken(1L, "test@example.com", List.of("VIEWER")))
                .thenReturn("access-token");
        when(jwtTokenProvider.generateRefreshToken(1L)).thenReturn("refresh-token");
        when(userMapper.toProfileResponse(user)).thenReturn(createProfile(user));

        AuthResponse response = authService.login(request);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void login_InvalidCredentials_ThrowsBadCredentialsException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("wrong");

        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authenticationManager)
                .authenticate(any(UsernamePasswordAuthenticationToken.class));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void refresh_WithValidToken_ReturnsAuthResponse() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("valid-refresh-token");

        User user = createUser(1L, "test@example.com", "encoded", "John", "Doe", null, Set.of(new Role("VIEWER")));

        when(jwtTokenProvider.validateToken("valid-refresh-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("valid-refresh-token")).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateAccessToken(anyLong(), anyString(), anyList())).thenReturn("new-access");
        when(jwtTokenProvider.generateRefreshToken(anyLong())).thenReturn("new-refresh");
        when(userMapper.toProfileResponse(user)).thenReturn(createProfile(user));

        AuthResponse response = authService.refresh(request);

        assertThat(response.getAccessToken()).isEqualTo("new-access");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh");
    }

    @Test
    void refresh_WithInvalidToken_ThrowsBusinessException() {
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("invalid-token");

        when(jwtTokenProvider.validateToken("invalid-token")).thenReturn(false);

        assertThatThrownBy(() -> authService.refresh(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Invalid or expired refresh token");
    }

    private User createUser(Long id, String email, String password, String firstName,
                            String lastName, String company, Set<Role> roles) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPasswordHash(password);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setCompany(company);
        user.setRoles(roles);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return user;
    }

    private UserProfileResponse createProfile(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .company(user.getCompany())
                .roles(user.getRoles().stream().map(Role::getName).collect(java.util.stream.Collectors.toSet()))
                .createdAt(user.getCreatedAt())
                .build();
    }
}
