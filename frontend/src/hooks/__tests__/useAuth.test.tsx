import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/auth'
import type { ReactNode } from 'react'

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useAuth', () => {
  it('throws error when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider')
  })

  it('starts unauthenticated when no user in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('loads user from localStorage on mount', () => {
    const userData = { id: 1, email: 'test@test.com', firstName: 'Test', lastName: 'User', fullName: 'Test User', company: '', avatarUrl: null, emailVerified: false, roles: ['VIEWER'], createdAt: '2026-01-01T00:00:00' }
    localStorage.setItem('user', JSON.stringify(userData))

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('test@test.com')
  })

  it('login stores tokens and user data', async () => {
    const userData = { id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', fullName: 'A B', company: '', avatarUrl: null, emailVerified: false, roles: ['VIEWER'], createdAt: '2026-01-01T00:00:00' }
    const mockLogin = vi.mocked(authApi.login)
    mockLogin.mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: 'atoken',
          refreshToken: 'rtoken',
          tokenType: 'Bearer',
          expiresIn: 86400000,
          user: userData,
        },
      },
    } as any)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'pass' })
    })

    expect(localStorage.getItem('accessToken')).toBe('atoken')
    expect(localStorage.getItem('refreshToken')).toBe('rtoken')
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(userData)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('logout clears tokens and user', () => {
    localStorage.setItem('accessToken', 'atoken')
    localStorage.setItem('refreshToken', 'rtoken')
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', fullName: 'A B', company: '', avatarUrl: null, emailVerified: false, roles: [], createdAt: '2026-01-01T00:00:00' }))

    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.logout()
    })

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('register stores tokens and user data', async () => {
    const userData = { id: 2, email: 'new@b.com', firstName: 'New', lastName: 'User', fullName: 'New User', company: '', avatarUrl: null, emailVerified: false, roles: ['VIEWER'], createdAt: '2026-01-01T00:00:00' }
    const mockRegister = vi.mocked(authApi.register)
    mockRegister.mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: 'atoken2',
          refreshToken: 'rtoken2',
          tokenType: 'Bearer',
          expiresIn: 86400000,
          user: userData,
        },
      },
    } as any)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.register({ firstName: 'New', lastName: 'User', email: 'new@b.com', password: 'pass1234' })
    })

    expect(localStorage.getItem('accessToken')).toBe('atoken2')
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('new@b.com')
  })
})
