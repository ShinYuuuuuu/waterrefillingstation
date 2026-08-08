import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FiUser, FiMail, FiHome, FiShield } from 'react-icons/fi'
import { useAuthContext } from '@/contexts/auth-context'

export function ProfilePage() {
  const [isLoading] = useState(false)
  const { user } = useAuthContext()
  const initials = user?.full_name
    ?.split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  if (isLoading) {
    return (
      <PageLayout
        title="Profile"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Profile' },
        ]}
      >
        <div className="flex flex-col items-center space-y-4">
          <Skeleton variant="circular" className="h-24 w-24" />
          <Skeleton variant="text" className="h-6 w-48" />
          <Skeleton variant="text" className="h-4 w-32" />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Profile"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Profile' },
      ]}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar
                fallback={initials}
                size="lg"
                className="mb-4"
              />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user?.full_name ?? 'User'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {user?.email ?? ''}
              </p>
              <Badge variant="info" className="mt-2">
                {(user?.role ?? 'user').replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <FiUser className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Full Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.full_name ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiMail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiHome className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Branch</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.branch_id ? 'Assigned Branch' : 'All Branches'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FiShield className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                  <p className="text-sm font-medium capitalize text-gray-900 dark:text-white">{(user?.role ?? 'user').replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
