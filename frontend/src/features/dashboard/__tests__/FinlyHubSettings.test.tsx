import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FinlyHubSettings } from '../FinlyHubSettings'
import type { UserProfile } from '@/types/auth'
import type { ApiResponse } from '@/types/api'
import type { AxiosResponse } from 'axios'

const mockUser: UserProfile = {
  id: 1,
  email: 'admin@finlyhub.com',
  firstName: 'Jane',
  lastName: 'Doe',
  fullName: 'Jane Doe',
  company: 'Finly Hub',
  avatarUrl: null,
  emailVerified: true,
  roles: ['ADMIN'],
  createdAt: '2026-01-01T00:00:00',
}

const mockUseAuth = vi.fn()
const mockUseTheme = vi.fn()
const mockToggleTheme = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => mockUseTheme(),
}))

vi.mock('@/api/auth', () => ({
  authApi: {
    updateProfile: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { authApi } from '@/api/auth'

describe('FinlyHubSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      updateUser: mockUpdateUser,
    })
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    })
  })

  it('renders the header', () => {
    render(<FinlyHubSettings />)
    expect(screen.getByText('Settings')).toBeTruthy()
    expect(screen.getByText('Manage your account and application preferences')).toBeTruthy()
  })

  it('renders profile form with user data', () => {
    render(<FinlyHubSettings />)
    const firstNameInput = screen.getByDisplayValue('Jane')
    const lastNameInput = screen.getByDisplayValue('Doe')
    const companyInput = screen.getByDisplayValue('Finly Hub')
    expect(firstNameInput).toBeTruthy()
    expect(lastNameInput).toBeTruthy()
    expect(companyInput).toBeTruthy()
  })

  it('renders user info section', () => {
    render(<FinlyHubSettings />)
    expect(screen.getByText('admin@finlyhub.com')).toBeTruthy()
    expect(screen.getByText('ADMIN')).toBeTruthy()
    expect(screen.getByText('User Info')).toBeTruthy()
  })

  it('renders theme toggle', () => {
    render(<FinlyHubSettings />)
    expect(screen.getByText('Appearance')).toBeTruthy()
    expect(screen.getByText('Theme')).toBeTruthy()
    expect(screen.getByText('Switch between dark and light mode')).toBeTruthy()
  })

  it('calls toggleTheme on theme button click', async () => {
    render(<FinlyHubSettings />)
    await userEvent.click(screen.getByLabelText('Toggle theme'))
    expect(mockToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('renders API & integrations section', () => {
    render(<FinlyHubSettings />)
    expect(screen.getByText('API & Integrations')).toBeTruthy()
    expect(screen.getByText('Connected')).toBeTruthy()
  })

  it('renders account section', () => {
    render(<FinlyHubSettings />)
    expect(screen.getByText('Account')).toBeTruthy()
    expect(screen.getByText('#1')).toBeTruthy()
    expect(screen.getByText('Yes')).toBeTruthy()
  })

  it('saves profile on button click', async () => {
    vi.mocked(authApi.updateProfile).mockResolvedValue({
      data: { success: true, data: mockUser, message: 'Profile updated', timestamp: '' },
    } as AxiosResponse<ApiResponse<UserProfile>>)
    render(<FinlyHubSettings />)
    await userEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(authApi.updateProfile).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe',
        company: 'Finly Hub',
      })
    })
  })
})
