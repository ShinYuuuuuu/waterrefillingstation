import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login, isLoading } = useAuthContext()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    console.log('[AUTH DEBUG] FORM_SUBMIT', { email: data.email })
    setError(null)
    try {
      await login(data)
      console.log('[AUTH DEBUG] NAVIGATING', { from: window.location.pathname, to: '/dashboard' })
      navigate('/dashboard', { replace: true })
      console.log('[AUTH DEBUG] NAVIGATING', { after: window.location.pathname })
    } catch (err: any) {
      console.log('[AUTH DEBUG] LOGIN_ERROR', { message: err?.message, status: err?.response?.status })
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Invalid email or password. Please try again.'
      setError(message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Sign in to your account
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <Input
            type="email"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <Input
            type="password"
            placeholder="Enter your password"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" loading={isLoading}>
          Sign in
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Demo credentials: any email/password
        </span>
      </div>
    </div>
  )
}
