import axios from 'axios'
import type { ApiResponse } from '@/types/api'

export const SESSION_EXPIRED_EVENT = 'finlyhub:session-expired'

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__ENV__?.API_URL) {
    return window.__ENV__.API_URL
  }
  return import.meta.env.VITE_API_URL || '/api'
}

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const clearSession = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

const expireSession = () => {
  clearSession()
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  window.location.href = '/'
}

const performRefresh = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    return null
  }
  try {
    const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${apiClient.defaults.baseURL}/auth/refresh`,
      { refreshToken }
    )
    if (data.success && data.data) {
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      return data.data.accessToken
    }
    return null
  } catch {
    return null
  }
}

let refreshPromise: Promise<string | null> | null = null

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (originalRequest?._retry || error.response?.status !== 401 || originalRequest.url?.includes('/auth/')) {
      throw error
    }

    originalRequest._retry = true

    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null
      })
    }

    const newToken = await refreshPromise

    if (newToken) {
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return apiClient(originalRequest)
    }

    expireSession()
    throw error
  }
)

export default apiClient
