package com.finlyhub.user.service;

import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.user.dto.UpdateUserRequest;
import com.finlyhub.user.dto.UserProfileResponse;
import com.finlyhub.user.entity.Role;
import com.finlyhub.user.entity.User;
import com.finlyhub.user.mapper.UserMapper;
import com.finlyhub.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserMapper userMapper;

    private UserService userService;
    private MockedStatic<SecurityUtils> securityUtils;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, userMapper);
        securityUtils = mockStatic(SecurityUtils.class);
    }

    @AfterEach
    void tearDown() {
        securityUtils.close();
    }

    @Test
    void getCurrentUserProfile_Success_ReturnsProfile() {
        User user = createUser(1L, "test@example.com", "Test", "User");
        UserProfileResponse profile = UserProfileResponse.builder()
                .id(1L).email("test@example.com").firstName("Test").lastName("User")
                .fullName("Test User").roles(Set.of("VIEWER")).build();

        securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userMapper.toProfileResponse(user)).thenReturn(profile);

        UserProfileResponse result = userService.getCurrentUserProfile();

        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getFullName()).isEqualTo("Test User");
    }

    @Test
    void getCurrentUserProfile_UserNotFound_ThrowsResourceNotFoundException() {
        securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn(99L);
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getCurrentUserProfile())
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void updateCurrentUser_Success_UpdatesAndReturnsProfile() {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setFirstName("Updated");
        request.setCompany("NewCo");

        User user = createUser(1L, "test@example.com", "Old", "User");
        UserProfileResponse updatedProfile = UserProfileResponse.builder()
                .id(1L).email("test@example.com").firstName("Updated").lastName("User")
                .fullName("Updated User").company("NewCo").roles(Set.of("VIEWER")).build();

        securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(userMapper.toProfileResponse(user)).thenReturn(updatedProfile);

        UserProfileResponse result = userService.updateCurrentUser(request);

        assertThat(result.getFirstName()).isEqualTo("Updated");
        assertThat(result.getCompany()).isEqualTo("NewCo");
        verify(userMapper).updateEntity(user, request);
        verify(userRepository).save(user);
    }

    @Test
    void getAllUsers_ReturnsListOfProfiles() {
        User user1 = createUser(1L, "a@test.com", "A", "One");
        User user2 = createUser(2L, "b@test.com", "B", "Two");
        UserProfileResponse profile1 = UserProfileResponse.builder().id(1L).email("a@test.com").build();
        UserProfileResponse profile2 = UserProfileResponse.builder().id(2L).email("b@test.com").build();

        when(userRepository.findAll()).thenReturn(List.of(user1, user2));
        when(userMapper.toProfileResponse(user1)).thenReturn(profile1);
        when(userMapper.toProfileResponse(user2)).thenReturn(profile2);

        List<UserProfileResponse> result = userService.getAllUsers();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getEmail()).isEqualTo("a@test.com");
        assertThat(result.get(1).getEmail()).isEqualTo("b@test.com");
    }

    private User createUser(Long id, String email, String firstName, String lastName) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRoles(Set.of(new Role("VIEWER")));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return user;
    }
}
