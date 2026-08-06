import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FiPlus } from 'react-icons/fi'

export function DeliveriesPage() {
  const [isLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const columns = [
    { key: 'order_id', header: 'Order ID' },
    { key: 'customer', header: 'Customer' },
    { key: 'address', header: 'Address' },
    { key: 'rider', header: 'Rider' },
    {
      key: 'status',
      header: 'Status',
      render: (item: { status: string }) => {
        const variantMap: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
          delivered: 'success',
          out_for_delivery: 'info',
          pending: 'warning',
          failed: 'danger',
        }
        return <Badge variant={variantMap[item.status] || 'default'}>{item.status}</Badge>
      },
    },
    { key: 'date', header: 'Date' },
  ]

  const data = [
    { id: '1', order_id: 'DEL-001', customer: 'Juan Dela Cruz', address: '123 Main St', rider: 'Rider A', status: 'delivered', date: '2026-08-04' },
    { id: '2', order_id: 'DEL-002', customer: 'Maria Santos', address: '456 Elm St', rider: 'Rider B', status: 'out_for_delivery', date: '2026-08-04' },
    { id: '3', order_id: 'DEL-003', customer: 'Pedro Cruz', address: '789 Oak Ave', rider: 'Rider C', status: 'pending', date: '2026-08-04' },
    { id: '4', order_id: 'DEL-004', customer: 'Ana Reyes', address: '321 Pine Rd', rider: 'Rider A', status: 'failed', date: '2026-08-03' },
  ]

  const filteredData = searchQuery
    ? data.filter(
        (item) =>
          item.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.customer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data

  if (isLoading) {
    return (
      <PageLayout
        title="Deliveries"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Deliveries' },
        ]}
      >
        <SkeletonTable rows={5} columns={4} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Deliveries"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Deliveries' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search deliveries..."
        />
        <Button>
          <FiPlus className="w-4 h-4 mr-2" />
          New Delivery
        </Button>
      </div>

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No deliveries match your search' : 'No deliveries recorded yet'}
            </p>
            <Button variant="outline" className="mt-4">
              Create delivery order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search deliveries..."
          emptyMessage="No deliveries found"
        />
      )}
    </PageLayout>
  )
}
