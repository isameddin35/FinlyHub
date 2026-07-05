import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Bot,
  ArrowLeftRight,
  Receipt,
  FileBarChart,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import { useRoleLabels } from '@/hooks/useRoleLabels'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const labels = useRoleLabels()

  const navItems = [
    { to: '/dashboard', label: labels.dashboard, icon: LayoutDashboard },
    { to: '/invoices', label: labels.invoices, icon: FileText },
    { to: '/copilot', label: labels.copilot, icon: Bot },
    { to: '/transactions', label: labels.transactions, icon: ArrowLeftRight },
    { to: '/reports', label: labels.reports, icon: FileBarChart },
    { to: '/reconciliation', label: labels.reconciliation, icon: Receipt },
    { to: '/documents', label: labels.documents, icon: FolderOpen },
    { to: '/settings', label: labels.settings, icon: Settings },
  ]

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">FH</span>
        </div>
        {!collapsed && <span className="font-semibold">{labels.appName}</span>}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <Separator />
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  )
}
