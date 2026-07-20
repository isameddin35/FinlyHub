import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { RegisterPage } from '@/features/auth/RegisterPage'

const mockRegister = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderRegister() {
  return render(
    <BrowserRouter>
      <RegisterPage />
    </BrowserRouter>
  )
}

describe('RegisterPage', () => {
  it('renders the registration form', () => {
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isAuthenticated: false,
      isLoading: false,
    })

    renderRegister()

    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('calls register with form data on submit', async () => {
    const user = userEvent.setup()
    mockRegister.mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isAuthenticated: false,
      isLoading: false,
    })

    renderRegister()

    await user.type(screen.getByLabelText('First name'), 'John')
    await user.type(screen.getByLabelText('Last name'), 'Doe')
    await user.type(screen.getByLabelText('Email'), 'john@test.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(mockRegister).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: 'password123',
      company: '',
    })
  })

  it('navigates to dashboard if already authenticated', () => {
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isAuthenticated: true,
      isLoading: false,
    })

    renderRegister()

    expect(screen.queryByText('Create account')).not.toBeInTheDocument()
  })
})
