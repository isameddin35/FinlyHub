import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, Store } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const DEMO_ACCOUNTS = Array.from({ length: 10 }, (_, i) =>
  `demo${String(i + 1).padStart(2, '0')}@finlyhub.com`
)

export function RoleSelectPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const loginAsDemo = async () => {
    const email = DEMO_ACCOUNTS[Math.floor(Math.random() * DEMO_ACCOUNTS.length)]
    try {
      await login({ email, password: 'password' })
      toast.success('Welcome to Finly Hub!')
      navigate('/dashboard')
    } catch {
      toast.error('Demo login failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl font-bold text-primary-foreground">FH</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Finly Hub</h1>
          <p className="mt-2 text-muted-foreground">Choose how you'd like to get started</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={loginAsDemo}
          >
            <CardHeader className="items-center text-center pb-2 pt-6">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">I run my own business</CardTitle>
              <CardDescription className="text-sm">
                Simple tools to track your money, bills, and paperwork
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-xs text-muted-foreground pb-6">
              Easy-to-understand language &middot; No accounting knowledge needed
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={loginAsDemo}
          >
            <CardHeader className="items-center text-center pb-2 pt-6">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">I'm a freelance accountant</CardTitle>
              <CardDescription className="text-sm">
                Professional tools with proper accounting terminology
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center text-xs text-muted-foreground pb-6">
              Full accounting vocabulary &middot; Client-ready reports
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
