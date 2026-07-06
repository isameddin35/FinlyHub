import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRoleLabels } from '@/hooks/useRoleLabels'

const mockUseAuth = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('useRoleLabels', () => {
  it('returns accountant labels when user has ACCOUNTANT role', () => {
    mockUseAuth.mockReturnValue({ user: { roles: ['ACCOUNTANT'] } })
    const { result } = renderHook(() => useRoleLabels())

    expect(result.current.invoices).toBe('Invoices')
    expect(result.current.dashboard).toBe('Dashboard')
    expect(result.current.transactions).toBe('Transactions')
  })

  it('returns owner labels when user does not have ACCOUNTANT role', () => {
    mockUseAuth.mockReturnValue({ user: { roles: ['VIEWER'] } })
    const { result } = renderHook(() => useRoleLabels())

    expect(result.current.invoices).toBe('Bills')
    expect(result.current.dashboard).toBe('Overview')
    expect(result.current.transactions).toBe('Spending')
  })

  it('returns owner labels when user has no roles', () => {
    mockUseAuth.mockReturnValue({ user: { roles: [] } })
    const { result } = renderHook(() => useRoleLabels())

    expect(result.current.invoices).toBe('Bills')
    expect(result.current.appName).toBe('Finly Hub')
  })

  it('returns owner labels when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useRoleLabels())

    expect(result.current.invoices).toBe('Bills')
  })
})
