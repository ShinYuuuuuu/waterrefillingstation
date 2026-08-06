import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </p>
      </div>
    </div>
  )
}
