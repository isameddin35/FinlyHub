import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'

const mockLogin = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderLogin() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  )
}

describe('LoginPage', () => {
  it('renders the login form with default fields', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
    })

    renderLogin()

    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('calls login on form submission', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
    })

    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(mockLogin).toHaveBeenCalledWith({ email: 'admin@finlyhub.com', password: 'password' })
  })

  it('shows "Signing in..." when loading', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: true,
    })

    renderLogin()

    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
  })

  it('navigates to dashboard if already authenticated', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: true,
      isLoading: false,
    })

    renderLogin()

    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument()
  })

  it('shows demo credentials for owner role', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
    })

    renderLogin()

    expect(screen.getByText(/admin@finlyhub.com/)).toBeInTheDocument()
    expect(screen.getByText(/viewer@finlyhub.com/)).toBeInTheDocument()
  })
})
