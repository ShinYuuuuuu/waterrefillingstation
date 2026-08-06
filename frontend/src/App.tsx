import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { ToastProvider } from '@/components/ui/toast'
import { RouterProvider } from 'react-router-dom'
import { AppRoutes } from './routes'
import { queryClient } from '@/lib/query-client'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={AppRoutes} />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
