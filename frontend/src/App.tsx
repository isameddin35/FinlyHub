import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleSelectPage } from '@/features/auth/RoleSelectPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { InvoicesPage } from '@/features/invoices/InvoicesPage'
import { CopilotPage } from '@/features/copilot/CopilotPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { ReconciliationPage } from '@/features/reconciliation/ReconciliationPage'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

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
            <Routes>
              <Route path="/role-select" element={<RoleSelectPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="copilot" element={<CopilotPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reconciliation" element={<ReconciliationPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/role-select" replace />} />
            </Routes>
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
