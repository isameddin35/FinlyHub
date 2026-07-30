import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinlyHubBills } from '../FinlyHubBills'
import { mockApiResponse } from '@/api/__tests__/test-utils'
import type { InvoiceResponse } from '@/types/invoice'

vi.mock('@/api/invoices', () => ({
  invoiceApi: {
    list: vi.fn(),
    upload: vi.fn(),
    approve: vi.fn(),
    exportApproved: vi.fn(),
    getById: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { invoiceApi } from '@/api/invoices'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockInvoice = (overrides: Partial<InvoiceResponse> = {}): InvoiceResponse => ({
  id: 1,
  invoiceNumber: 'INV-001',
  vendorName: 'Acme Corp',
  vendorEmail: 'billing@acme.com',
  invoiceDate: '2026-07-15',
  dueDate: '2026-08-14',
  currency: 'USD',
  subtotal: 1000,
  taxAmount: 100,
  vatAmount: null,
  discountAmount: null,
  totalAmount: 1100,
  status: 'PENDING',
  confidenceScore: 92,
  createdAt: '2026-07-15T10:00:00',
  ...overrides,
})

describe('FinlyHubBills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetching', () => {
    vi.mocked(invoiceApi.list).mockReturnValue(new Promise(() => {}))
    renderWithQuery(<FinlyHubBills />)
    const spinner = document.querySelector('.fhb-spinner')
    expect(spinner).toBeTruthy()
  })

  it('shows empty state when no invoices', async () => {
    vi.mocked(invoiceApi.list).mockResolvedValue(mockApiResponse({ content: [] }))
    renderWithQuery(<FinlyHubBills />)
    await waitFor(() => {
      expect(screen.getByText('No invoices processed yet.')).toBeTruthy()
    })
  })

  it('shows error state on failure', async () => {
    vi.mocked(invoiceApi.list).mockRejectedValue(new Error('API error'))
    renderWithQuery(<FinlyHubBills />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load invoices. Please try again.')).toBeTruthy()
    })
  })

  it('renders invoice cards with vendor and amount', async () => {
    vi.mocked(invoiceApi.list).mockResolvedValue(mockApiResponse({
      content: [mockInvoice(), mockInvoice({ id: 2, vendorName: 'Beta Inc', totalAmount: 2500, invoiceNumber: 'INV-002' })],
    }))
    renderWithQuery(<FinlyHubBills />)
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeTruthy()
      expect(screen.getByText('Beta Inc')).toBeTruthy()
      expect(screen.getByText('INV-001')).toBeTruthy()
      expect(screen.getByText('INV-002')).toBeTruthy()
      expect(screen.getAllByText('PENDING').length).toBe(2)
    })
  })

  it('opens approval modal when clicking an invoice card', async () => {
    vi.mocked(invoiceApi.list).mockResolvedValue(mockApiResponse({ content: [mockInvoice()] }))
    renderWithQuery(<FinlyHubBills />)
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeTruthy()
    })
    await userEvent.click(screen.getByText('Acme Corp'))
    await waitFor(() => {
      expect(screen.getByText('Invoice Details')).toBeTruthy()
      expect(screen.getByText('Approve')).toBeTruthy()
    })
  })

  it('renders the export button', async () => {
    vi.mocked(invoiceApi.list).mockResolvedValue(mockApiResponse({ content: [mockInvoice()] }))
    renderWithQuery(<FinlyHubBills />)
    await waitFor(() => {
      expect(screen.getByText('Export to Excel')).toBeTruthy()
    })
  })

  it('renders the upload dropzone', () => {
    vi.mocked(invoiceApi.list).mockResolvedValue(mockApiResponse({ content: [] }))
    renderWithQuery(<FinlyHubBills />)
    expect(screen.getByText('Drop files here or click to upload')).toBeTruthy()
    expect(screen.getByText('PDF, PNG, or JPG — up to 10MB')).toBeTruthy()
  })
})
