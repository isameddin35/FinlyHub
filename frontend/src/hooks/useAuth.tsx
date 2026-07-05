import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { UserProfile, LoginRequest, RegisterRequest } from '@/types/auth'
import { authApi } from '@/api/auth'

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  updateUser: (user: UserProfile) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true)
    try {
      const response = await authApi.login(data)
      const { accessToken, refreshToken, user: userData } = response.data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true)
    try {
      const response = await authApi.register(data)
      const { accessToken, refreshToken, user: userData } = response.data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const updateUser = useCallback((updated: UserProfile) => {
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
