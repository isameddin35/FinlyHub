package com.finlyhub.user.mapper;

import com.finlyhub.user.dto.UpdateUserRequest;
import com.finlyhub.user.dto.UserProfileResponse;
import com.finlyhub.user.entity.Role;
import com.finlyhub.user.entity.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class UserMapperTest {

    private final UserMapper mapper = new UserMapper();

    @Test
    void toProfileResponse_MapsAllFieldsCorrectly() {
        User user = new User();
        user.setId(1L);
        user.setEmail("john@example.com");
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setCompany("Acme");
        user.setAvatarUrl("https://avatar.example.com/john.jpg");
        user.setEmailVerified(true);
        user.setRoles(Set.of(new Role("ADMIN"), new Role("VIEWER")));
        user.setCreatedAt(LocalDateTime.of(2026, 1, 1, 0, 0));

        UserProfileResponse response = mapper.toProfileResponse(user);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getEmail()).isEqualTo("john@example.com");
        assertThat(response.getFirstName()).isEqualTo("John");
        assertThat(response.getLastName()).isEqualTo("Doe");
        assertThat(response.getFullName()).isEqualTo("John Doe");
        assertThat(response.getCompany()).isEqualTo("Acme");
        assertThat(response.getAvatarUrl()).isEqualTo("https://avatar.example.com/john.jpg");
        assertThat(response.isEmailVerified()).isTrue();
        assertThat(response.getRoles()).containsExactlyInAnyOrder("ADMIN", "VIEWER");
        assertThat(response.getCreatedAt()).isNotNull();
    }

    @Test
    void toProfileResponse_MapsSingleRoleCorrectly() {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setFirstName("Test");
        user.setLastName("User");
        user.setRoles(Set.of(new Role("VIEWER")));
        user.setCreatedAt(LocalDateTime.now());

        UserProfileResponse response = mapper.toProfileResponse(user);

        assertThat(response.getRoles()).hasSize(1);
        assertThat(response.getRoles()).contains("VIEWER");
    }

    @Test
    void updateEntity_UpdatesNonNullFieldsOnly() {
        User user = new User();
        user.setFirstName("Old");
        user.setLastName("Name");
        user.setCompany("OldCo");
        user.setAvatarUrl("old.jpg");

        UpdateUserRequest request = new UpdateUserRequest();
        request.setFirstName("New");
        request.setCompany(null);

        mapper.updateEntity(user, request);

        assertThat(user.getFirstName()).isEqualTo("New");
        assertThat(user.getLastName()).isEqualTo("Name");
        assertThat(user.getCompany()).isEqualTo("OldCo");
        assertThat(user.getAvatarUrl()).isEqualTo("old.jpg");
    }
}
