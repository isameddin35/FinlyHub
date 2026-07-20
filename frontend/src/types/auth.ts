export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  company?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: UserProfile
}

export interface UserProfile {
  id: number
  email: string
  firstName: string
  lastName: string
  fullName: string
  company: string
  avatarUrl: string | null
  emailVerified: boolean
  roles: string[]
  createdAt: string
}

export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
  company?: string
  avatarUrl?: string
}
