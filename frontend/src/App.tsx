import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FinlyHubLanding } from '@/features/landing/FinlyHubLanding'
import { NewDashboardLayout } from '@/components/layout/NewDashboardLayout'
import { FinlyHubOverview } from '@/features/dashboard/FinlyHubOverview'
import { FinlyHubBills } from '@/features/dashboard/FinlyHubBills'
import { FinlyHubAssistant } from '@/features/dashboard/FinlyHubAssistant'
import { FinlyHubSpending } from '@/features/dashboard/FinlyHubSpending'
import { FinlyHubReports } from '@/features/dashboard/FinlyHubReports'
import { FinlyHubMatchRecords } from '@/features/dashboard/FinlyHubMatchRecords'
import { FinlyHubDocuments } from '@/features/dashboard/FinlyHubDocuments'
import { FinlyHubSettings } from '@/features/dashboard/FinlyHubSettings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ErrorBoundary>
              <Routes>
              <Route path="/" element={<FinlyHubLanding />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route element={<NewDashboardLayout />}>
                <Route path="/dashboard" element={<FinlyHubOverview />} />
                <Route path="/invoices" element={<FinlyHubBills />} />
                <Route path="/copilot" element={<FinlyHubAssistant />} />
                <Route path="/transactions" element={<FinlyHubSpending />} />
                <Route path="/reports" element={<FinlyHubReports />} />
                <Route path="/reconciliation" element={<FinlyHubMatchRecords />} />
                <Route path="/documents" element={<FinlyHubDocuments />} />
                <Route path="/settings" element={<FinlyHubSettings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </ErrorBoundary>
            <Toaster
              position="top-right"
              toastOptions={{
                className: '!bg-card !text-foreground !border !border-border',
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
