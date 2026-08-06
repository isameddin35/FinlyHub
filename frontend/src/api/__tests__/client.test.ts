import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'

const { instance, mockRefreshPost } = vi.hoisted(() => {
  const instance = Object.assign(vi.fn(), {
    defaults: { baseURL: '/api' },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  })
  return { instance, mockRefreshPost: vi.fn() }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => instance),
    post: (...args: unknown[]) => mockRefreshPost(...args),
  },
}))

import { SESSION_EXPIRED_EVENT } from '@/api/client'

const responseRejected = vi
  .mocked(instance.interceptors.response.use)
  .mock.calls[0][1] as (error: unknown) => Promise<unknown>

const unauthorized = (config: Partial<InternalAxiosRequestConfig> = {}) => ({
  response: {
    status: 401,
    data: { success: false, message: 'Unauthorized' },
  },
  config: { url: '/invoices', headers: {}, ...config },
})

const successfulRefresh = () => {
  mockRefreshPost.mockResolvedValue({
    data: {
      success: true,
      message: 'Token refreshed',
      data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
      timestamp: '2024-01-01T00:00:00Z',
    },
  })
}

describe('apiClient auth interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    instance.mockReset()
    instance.post.mockReset()
    instance.get.mockReset()
    instance.put.mockReset()
  })

  it('refreshes once on 401 and retries the original request with the new token', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    successfulRefresh()
    instance.mockResolvedValue({ data: { ok: true } })

    const result = await responseRejected(unauthorized())

    expect(mockRefreshPost).toHaveBeenCalledTimes(1)
    expect(mockRefreshPost).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'old-refresh' })
    expect(localStorage.getItem('accessToken')).toBe('new-access')
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh')

    const retried = vi.mocked(instance).mock.calls[0][0] as InternalAxiosRequestConfig
    expect(retried.headers.Authorization).toBe('Bearer new-access')
    expect(result).toEqual({ data: { ok: true } })
  })

  it('deduplicates parallel 401s into a single refresh call', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    successfulRefresh()
    instance.mockResolvedValue({ data: { ok: true } })

    await Promise.all([
      responseRejected(unauthorized()),
      responseRejected(unauthorized()),
      responseRejected(unauthorized()),
    ])

    expect(mockRefreshPost).toHaveBeenCalledTimes(1)
    expect(instance).toHaveBeenCalledTimes(3)
  })

  it('clears tokens and user, dispatches event and redirects when refresh fails', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'admin@finlyhub.com' }))

    mockRefreshPost.mockRejectedValue(new Error('refresh failed'))
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    })

    const error = unauthorized()
    try {
      await expect(responseRejected(error)).rejects.toBe(error)
    } finally {
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: SESSION_EXPIRED_EVENT })
      )
      expect(window.location.href).toBe('/')
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    }
  })

  it('does not refresh on non-401 errors', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')

    const error = { response: { status: 500, data: {} }, config: { url: '/invoices', headers: {} } }

    await expect(responseRejected(error)).rejects.toBe(error)
    expect(mockRefreshPost).not.toHaveBeenCalled()
    expect(instance).not.toHaveBeenCalled()
  })

  it('does not refresh on 401 from auth endpoints', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')

    const error = unauthorized({ url: '/auth/login' })

    await expect(responseRejected(error)).rejects.toBe(error)
    expect(mockRefreshPost).not.toHaveBeenCalled()
  })

  it('does not retry the same request twice', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    successfulRefresh()
    instance.mockResolvedValue({ data: { ok: true } })

    await responseRejected(unauthorized())
    expect(mockRefreshPost).toHaveBeenCalledTimes(1)

    const retried = vi.mocked(instance).mock.calls[0][0] as InternalAxiosRequestConfig
    const retryError = { response: { status: 401, data: {} }, config: retried }

    await expect(responseRejected(retryError)).rejects.toBe(retryError)
    expect(mockRefreshPost).toHaveBeenCalledTimes(1)
  })
})
