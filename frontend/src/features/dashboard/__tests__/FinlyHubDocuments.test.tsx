import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinlyHubDocuments } from '../FinlyHubDocuments'
import { mockApiResponse } from '@/api/__tests__/test-utils'
import type { Document } from '@/types/document'

vi.mock('@/api/documents', () => ({
  documentApi: {
    list: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    reprocess: vi.fn(),
    download: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { documentApi } from '@/api/documents'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockDoc = (overrides: Partial<Document> = {}): Document => ({
  id: 1,
  filename: 'invoice-1042.pdf',
  originalFilename: 'invoice-1042.pdf',
  contentType: 'application/pdf',
  fileSize: 245760,
  documentType: 'PDF',
  status: 'INDEXED',
  totalChunks: 0,
  indexedChunks: 0,
  createdAt: '2026-07-15T10:00:00',
  updatedAt: '2026-07-15T10:05:00',
  ...overrides,
})

describe('FinlyHubDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetching', () => {
    vi.mocked(documentApi.list).mockReturnValue(new Promise(() => {}))
    renderWithQuery(<FinlyHubDocuments />)
    const spinner = document.querySelector('.fhdc-spinner')
    expect(spinner).toBeTruthy()
  })

  it('shows empty state when no documents', async () => {
    vi.mocked(documentApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubDocuments />)
    await waitFor(() => {
      expect(screen.getByText('No documents uploaded yet.')).toBeTruthy()
    })
  })

  it('shows error state on failure', async () => {
    vi.mocked(documentApi.list).mockRejectedValue(new Error('API error'))
    renderWithQuery(<FinlyHubDocuments />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load documents. Please try again.')).toBeTruthy()
    })
  })

  it('renders document list with filenames', async () => {
    vi.mocked(documentApi.list).mockResolvedValue(mockApiResponse([
      mockDoc(),
      mockDoc({ id: 2, originalFilename: 'report-q1.xlsx', status: 'PROCESSING' }),
    ]))
    renderWithQuery(<FinlyHubDocuments />)
    await waitFor(() => {
      expect(screen.getByText('invoice-1042.pdf')).toBeTruthy()
      expect(screen.getByText('report-q1.xlsx')).toBeTruthy()
      expect(screen.getByText('Indexed')).toBeTruthy()
      expect(screen.getByText('Processing')).toBeTruthy()
    })
  })

  it('renders the upload dropzone', async () => {
    vi.mocked(documentApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubDocuments />)
    await waitFor(() => {
      expect(screen.getByText('Upload Document')).toBeTruthy()
      expect(screen.getByText('Drag & drop or click to browse')).toBeTruthy()
      expect(screen.getByText('PDF, DOCX, or TXT files')).toBeTruthy()
    })
  })

  it('renders action buttons for documents', async () => {
    vi.mocked(documentApi.list).mockResolvedValue(mockApiResponse([mockDoc()]))
    renderWithQuery(<FinlyHubDocuments />)
    await waitFor(() => {
      expect(screen.getByLabelText('View')).toBeTruthy()
      expect(screen.getByLabelText('Download')).toBeTruthy()
      expect(screen.getByLabelText('Delete')).toBeTruthy()
    })
  })

  it('shows reprocess button for errored documents', async () => {
    vi.mocked(documentApi.list).mockResolvedValue(mockApiResponse([
      mockDoc({ id: 1, status: 'ERROR', errorMessage: 'Parsing failed' }),
    ]))
    renderWithQuery(<FinlyHubDocuments />)
    await waitFor(() => {
      expect(screen.getByLabelText('Reprocess')).toBeTruthy()
      expect(screen.getByText('Parsing failed')).toBeTruthy()
    })
  })

  it('shows indexing progress for processing documents', async () => {
    vi.mocked(documentApi.list).mockResolvedValue(mockApiResponse([
      mockDoc({ id: 1, status: 'PROCESSING', totalChunks: 10, indexedChunks: 4 }),
    ]))
    renderWithQuery(<FinlyHubDocuments />)
    await waitFor(() => {
      expect(screen.getByText('40%')).toBeTruthy()
    })
  })
})
