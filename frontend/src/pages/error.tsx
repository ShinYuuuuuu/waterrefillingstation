import { Link } from 'react-router-dom'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { FiAlertTriangle } from 'react-icons/fi'

export function ErrorPage() {
  return (
    <PageLayout
      title="Something Went Wrong"
      breadcrumbItems={[{ label: 'Error' }]}
    >
      <Card className="max-w-md mx-auto text-center">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FiAlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            An Error Occurred
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Something went wrong on our end. Please try again later or return to the dashboard.
          </p>
          <div className="flex gap-3">
            <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 px-4 py-2 text-sm"
          >
            Go to Dashboard
          </Link>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
