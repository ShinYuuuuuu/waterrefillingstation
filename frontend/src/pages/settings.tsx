import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FiDownload, FiShoppingBag, FiBell, FiShield, FiDroplet, FiUsers, FiSave } from 'react-icons/fi'
import { staffService, type StaffAccount } from '@/services/staff.service'
import { useToast } from '@/components/ui/toast'

function StaffAccountForm({ account }: { account: StaffAccount }) {
  const [fullName, setFullName] = useState(account.fullName)
  const [email, setEmail] = useState(account.email)
  const [password, setPassword] = useState('')
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  useEffect(() => {
    setFullName(account.fullName)
    setEmail(account.email)
  }, [account.fullName, account.email])

  const updateAccount = useMutation({
    mutationFn: () => staffService.update(account.id, {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      ...(password ? { password } : {}),
    }),
    onSuccess: () => {
      setPassword('')
      queryClient.invalidateQueries({ queryKey: ['staff-accounts'] })
      addToast({ type: 'success', title: `${account.role === 'CASHIER' ? 'Cashier' : 'Rider'} account updated` })
    },
    onError: (error: any) => addToast({
      type: 'error',
      title: 'Could not update account',
      description: error.response?.data?.error?.message ?? 'Please check the details and try again.',
    }),
  })

  return (
    <form
      className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4"
      onSubmit={(event) => { event.preventDefault(); updateAccount.mutate() }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {account.role === 'CASHIER' ? 'Cashier Account' : 'Rider Account'}
          </p>
          <p className="text-xs text-gray-500">Used to sign in to the {account.role.toLowerCase()} workspace</p>
        </div>
        <Badge variant="success">Active</Badge>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username / Full Name</label>
        <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={150} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Login Email</label>
        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Leave blank to keep current password"
          minLength={8}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-gray-500">At least 8 characters. Existing sessions cannot refresh and must use the new password.</p>
      </div>
      <Button type="submit" loading={updateAccount.isPending} disabled={!fullName.trim() || !email.trim()}>
        <FiSave className="w-4 h-4" /> Save Account
      </Button>
    </form>
  )
}

export function StaffAccountsPanel() {
  const staffAccounts = useQuery({
    queryKey: ['staff-accounts'],
    queryFn: staffService.list,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiUsers className="w-5 h-5" /> Staff Login Accounts
        </CardTitle>
        <CardDescription>Manage the names, login emails, and passwords used by your cashier and rider.</CardDescription>
      </CardHeader>
      <CardContent>
        {staffAccounts.isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
        ) : staffAccounts.isError ? (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">Staff accounts could not be loaded. Please refresh the page.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {staffAccounts.data?.map((account) => <StaffAccountForm key={account.id} account={account} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

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
                <Input defaultValue="Z's Purified Drinking Water" />
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
                  Place / Address (optional)
                </label>
                <Input defaultValue="123 Main St, Manila" />
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
