import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FiDownload, FiShoppingBag, FiBell, FiShield, FiDroplet } from 'react-icons/fi'

export function SettingsPage() {
  const [isLoading] = useState(false)

  if (isLoading) {
    return (
      <PageLayout
        title="Settings"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      >
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton variant="text" className="h-4 w-32" />
                <Skeleton variant="text" className="h-10 w-full" />
                <Skeleton variant="text" className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Settings"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings' },
      ]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiShoppingBag className="w-5 h-5" />
              Business Settings
            </CardTitle>
            <CardDescription>Configure your business information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name
                </label>
                <Input defaultValue="Water Station Inc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch
                </label>
                <Select
                  options={[
                    { value: 'main', label: 'Main Branch' },
                    { value: 'branch-2', label: 'Branch 2' },
                    { value: 'branch-3', label: 'Branch 3' },
                  ]}
                  defaultValue="main"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <Input defaultValue="123 Main St, Manila" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Number
                </label>
                <Input defaultValue="02-1234-5678" />
              </div>
            </div>
            <Button>
              <FiDownload className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiBell className="w-5 h-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive notifications via email
                </p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Low Stock Alerts
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get alerted when stock is low
                </p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Delivery Updates
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get notified about delivery status
                </p>
              </div>
              <Badge variant="secondary">Disabled</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiShield className="w-5 h-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Two-Factor Authentication
              </label>
              <Badge variant="warning">Not Enabled</Badge>
            </div>
            <Button variant="outline">Enable 2FA</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiDroplet className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Dark Mode
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Switch between light and dark theme
                </p>
              </div>
              <Badge variant="info">Theme Toggle</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
