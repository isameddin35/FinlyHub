import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authApi } from '@/api/auth'
import apiClient from '@/api/client'

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}))

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('login posts to /auth/login with credentials', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue({ data: { success: true, data: { accessToken: 'token' } } } as any)

    await authApi.login({ email: 'admin@test.com', password: 'pass' })

    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@test.com',
      password: 'pass',
    })
  })

  it('register posts to /auth/register with user data', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue({ data: { success: true } } as any)

    await authApi.register({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: 'password123',
    })

    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: 'password123',
    })
  })

  it('refresh posts refresh token to /auth/refresh', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue({ data: { success: true } } as any)

    await authApi.refresh('refresh-token-value')

    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'refresh-token-value',
    })
  })

  it('getProfile gets /users/me', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue({ data: { success: true } } as any)

    await authApi.getProfile()

    expect(mockGet).toHaveBeenCalledWith('/users/me')
  })
})
