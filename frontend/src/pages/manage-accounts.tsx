import { PageLayout } from '@/layouts/page-layout'
import { StaffAccountsPanel } from '@/pages/settings'

export function ManageAccountsPage() {
  return (
    <PageLayout
      title="Manage Accounts"
      breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Manage Accounts' }]}
    >
      <div className="max-w-5xl mx-auto">
        <StaffAccountsPanel />
      </div>
    </PageLayout>
  )
}
