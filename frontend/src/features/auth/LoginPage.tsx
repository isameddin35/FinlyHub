import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role')
  const defaultEmail = role === 'accountant' ? 'accountant@finlyhub.com' : 'admin@finlyhub.com'
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('password')

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      toast.success('Welcome back!')
    } catch {
      toast.error('Invalid email or password')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl font-bold text-primary-foreground">FH</span>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your Finly Hub account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to={role === 'accountant' ? '/register?role=accountant' : '/register'} className="text-primary hover:underline">Create one</Link>
          </p>
          <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Demo credentials:</p>
            {role === 'accountant' ? (
              <p>Accountant: accountant@finlyhub.com / password</p>
            ) : (
              <>
                <p>Owner: admin@finlyhub.com / password</p>
                <p>Viewer: viewer@finlyhub.com / password</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
