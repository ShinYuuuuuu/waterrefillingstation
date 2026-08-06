import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FiPlus } from 'react-icons/fi'

export function SalesPage() {
  const [isLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const columns = [
    { key: 'transaction_id', header: 'Transaction ID' },
    { key: 'customer', header: 'Customer' },
    { key: 'amount', header: 'Amount' },
    { key: 'payment_method', header: 'Payment Method' },
    {
      key: 'status',
      header: 'Status',
      render: (item: { status: string }) => (
        <Badge variant={item.status === 'completed' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'}>
          {item.status}
        </Badge>
      ),
    },
    { key: 'date', header: 'Date' },
  ]

  const data = [
    { id: '1', transaction_id: 'TXN-001', customer: 'Juan Dela Cruz', amount: '₱150.00', payment_method: 'CASH', status: 'completed', date: '2026-08-04' },
    { id: '2', transaction_id: 'TXN-002', customer: 'Maria Santos', amount: '₱200.00', payment_method: 'GCASH', status: 'completed', date: '2026-08-04' },
    { id: '3', transaction_id: 'TXN-003', customer: 'Pedro Cruz', amount: '₱75.00', payment_method: 'CASH', status: 'pending', date: '2026-08-04' },
    { id: '4', transaction_id: 'TXN-004', customer: 'Ana Reyes', amount: '₱300.00', payment_method: 'BANK_TRANSFER', status: 'completed', date: '2026-08-03' },
  ]

  const filteredData = searchQuery
    ? data.filter(
        (item) =>
          item.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.customer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data

  if (isLoading) {
    return (
      <PageLayout
        title="Sales"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sales' },
        ]}
      >
        <SkeletonTable rows={5} columns={4} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Sales"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search sales..."
        />
        <Button>
          <FiPlus className="w-4 h-4 mr-2" />
          New Sale
        </Button>
      </div>

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No sales match your search' : 'No sales recorded yet'}
            </p>
            <Button variant="outline" className="mt-4">
              Record a sale
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search sales..."
          emptyMessage="No sales found"
        />
      )}
    </PageLayout>
  )
}
