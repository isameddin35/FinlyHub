import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FinlyHubLanding } from '../FinlyHubLanding'

const mockNavigate = vi.fn()
const mockUseAuth = vi.fn()
const mockLogin = vi.fn()
const mockRegister = vi.fn()

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => {
    mockNavigate(to)
    return null
  },
  useNavigate: () => vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}))

describe('FinlyHubLanding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    mockLogin.mockResolvedValue(undefined)
    mockRegister.mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      login: mockLogin,
      register: mockRegister,
      user: null,
    })
  })

  it('redirects to dashboard when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, login: mockLogin, register: mockRegister, user: null })
    render(<FinlyHubLanding />)
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('renders hero section when not authenticated', () => {
    render(<FinlyHubLanding />)
    expect(screen.getByText('Finance, Simplified')).toBeTruthy()
    expect(screen.getByText('Log in')).toBeTruthy()
  })

  it('renders value proposition cards', () => {
    render(<FinlyHubLanding />)
    expect(screen.getByText('Why Finly Hub')).toBeTruthy()
    expect(screen.getByText('Bank-level Security')).toBeTruthy()
    expect(screen.getByText('Real-time Analytics')).toBeTruthy()
    expect(screen.getByText('Automated Tax Reports')).toBeTruthy()
  })

  it('renders CTA section', () => {
    render(<FinlyHubLanding />)
    expect(screen.getByText('Ready to')).toBeTruthy()
    expect(screen.getByText('get started?')).toBeTruthy()
    expect(screen.getByText('Create your free account')).toBeTruthy()
  })

  it('shows login modal when Log in is clicked', async () => {
    render(<FinlyHubLanding />)
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => {
      expect(screen.getByText('Welcome back')).toBeTruthy()
    })
  })

  it('shows signup modal when Create your free account is clicked', async () => {
    render(<FinlyHubLanding />)
    await userEvent.click(screen.getByText('Create your free account'))
    await waitFor(() => {
      expect(screen.getAllByText('Create account')).toHaveLength(2)
      expect(screen.getByText('Get started with')).toBeTruthy()
    })
  })
})
