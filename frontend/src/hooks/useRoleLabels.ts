import { useAuth } from '@/hooks/useAuth'

interface RoleLabels {
  appName: string
  dashboard: string
  invoices: string
  copilot: string
  transactions: string
  reports: string
  reconciliation: string
  documents: string
  settings: string
  invoicesProcessed: string
  documentsIndexed: string
  transactionsCategorized: string
  reconciliations: string
  hoursSaved: string
  revenue: string
  expenses: string
  revenueVsExpenses: string
  recentActivity: string
  financialOverview: string
}

const accountantLabels: RoleLabels = {
  appName: 'Finly Hub',
  dashboard: 'Dashboard',
  invoices: 'Invoices',
  copilot: 'AI Copilot',
  transactions: 'Transactions',
  reports: 'Reports',
  reconciliation: 'Reconciliation',
  documents: 'Documents',
  settings: 'Settings',
  invoicesProcessed: 'Invoices Processed',
  documentsIndexed: 'Documents Indexed',
  transactionsCategorized: 'Transactions Categorized',
  reconciliations: 'Reconciliations',
  hoursSaved: 'Hours Saved',
  revenue: 'Revenue',
  expenses: 'Expenses',
  revenueVsExpenses: 'Revenue vs Expenses',
  recentActivity: 'Recent Activity',
  financialOverview: 'Your financial overview at a glance',
}

const ownerLabels: RoleLabels = {
  appName: 'Finly Hub',
  dashboard: 'Overview',
  invoices: 'Bills',
  copilot: 'AI Assistant',
  transactions: 'Spending',
  reports: 'Reports',
  reconciliation: 'Match Records',
  documents: 'Documents',
  settings: 'Settings',
  invoicesProcessed: 'Bills Ready',
  documentsIndexed: 'Files Organized',
  transactionsCategorized: 'Spending Sorted',
  reconciliations: 'Records Matched',
  hoursSaved: 'Time Saved',
  revenue: 'Money Coming In',
  expenses: 'Money Going Out',
  revenueVsExpenses: 'Income vs Spending',
  recentActivity: 'Recent Activity',
  financialOverview: 'Your money at a glance',
}

export function useRoleLabels(): RoleLabels {
  const { user } = useAuth()
  const isAccountant = user?.roles?.includes('ACCOUNTANT')
  return isAccountant ? accountantLabels : ownerLabels
}
