import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { authService } from '@/services/auth.service'
import { FiHome, FiMail, FiSave, FiShield, FiUser } from 'react-icons/fi'
import { useAuthContext } from '@/contexts/auth-context'

export function ProfilePage() {
  const { user, setUser } = useAuthContext()
  const canEditProfile = user?.role === 'owner' || user?.role === 'super_admin'
  const { addToast } = useToast()
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [formError, setFormError] = useState('')

  const updateProfile = useMutation({
    mutationFn: () => authService.updateProfile({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
    }),
    onSuccess: (updated) => {
      if (user) setUser({ ...user, full_name: updated.fullName, email: updated.email })
      setFullName(updated.fullName)
      setEmail(updated.email)
      setFormError('')
      addToast({
        type: 'success',
        title: 'Profile updated',
        description: 'Use the new email the next time you sign in.',
      })
    },
    onError: (error: any) => {
      setFormError(error.response?.data?.error?.message ?? 'Could not update profile')
    },
  })

  const initials = user?.full_name
    ?.split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  return (
    <PageLayout
      title="Profile"
      breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar fallback={initials} size="lg" className="mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.full_name ?? 'User'}</h2>
              <p className="text-gray-500 dark:text-gray-400">{user?.email ?? ''}</p>
              <Badge variant="info" className="mt-2">{(user?.role ?? 'user').replace('_', ' ')}</Badge>
            </div>
          </CardContent>
        </Card>

        {canEditProfile && (
          <Card>
            <CardHeader><CardTitle>Edit Personal Information</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); updateProfile.mutate() }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={150} required leftIcon={<FiUser />} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Login Email</label>
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required leftIcon={<FiMail />} />
                  <p className="mt-1 text-xs text-gray-500">This email will be used the next time you sign in.</p>
                </div>
                {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
                <Button type="submit" loading={updateProfile.isPending} disabled={!fullName.trim() || !email.trim()}>
                  <FiSave className="w-4 h-4" /> Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Account Access</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
