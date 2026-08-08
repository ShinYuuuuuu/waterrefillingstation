import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { APP_LOGO_URL, APP_NAME } from '@/constants'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e0f7ff,_transparent_42%),linear-gradient(135deg,_#f8fcff,_#eaf6ff)] dark:bg-none dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <img src={APP_LOGO_URL} alt={`${APP_NAME} logo`} className="h-32 w-32 rounded-full object-cover shadow-md ring-4 ring-white" />
            <span className="text-xl font-semibold tracking-wide text-primary-900 dark:text-white">{APP_NAME}</span>
          </Link>
        </div>
        <div className="bg-white/95 dark:bg-gray-800 rounded-2xl shadow-xl shadow-primary-900/10 p-8 border border-primary-100 dark:border-gray-700 backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  )
}
