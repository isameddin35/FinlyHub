import apiClient from './client'
import type { ApiResponse } from '@/types/api'
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile, UpdateUserRequest } from '@/types/auth'

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken }),

  getProfile: () =>
    apiClient.get<ApiResponse<UserProfile>>('/users/me'),

  updateProfile: (data: UpdateUserRequest) =>
    apiClient.put<ApiResponse<UserProfile>>('/users/me', data),
}
