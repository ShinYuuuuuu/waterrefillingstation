import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FiPlus } from 'react-icons/fi'

export function CustomersPage() {
  const [isLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const columns = [
    { key: 'name', header: 'Customer Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'type',
      header: 'Type',
      render: (item: { type: string }) => (
        <Badge variant={item.type === 'RETAIL' ? 'info' : 'secondary'}>
          {item.type}
        </Badge>
      ),
    },
    { key: 'created_at', header: 'Joined' },
  ]

  const data = [
    { id: '1', name: 'Juan Dela Cruz', email: 'juan@email.com', phone: '09123456789', type: 'RETAIL', created_at: '2026-01-15' },
    { id: '2', name: 'Maria Santos', email: 'maria@email.com', phone: '09987654321', type: 'RESELLER', created_at: '2026-02-20' },
    { id: '3', name: 'Pedro Cruz', email: 'pedro@email.com', phone: '09111111111', type: 'CORPORATE', created_at: '2026-03-10' },
  ]

  const filteredData = searchQuery
    ? data.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data

  if (isLoading) {
    return (
      <PageLayout
        title="Customers"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers' },
        ]}
      >
        <SkeletonTable rows={5} columns={4} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Customers"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Customers' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search customers..."
        />
        <Button>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No customers match your search' : 'No customers yet'}
            </p>
            <Button variant="outline" className="mt-4">
              Add your first customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search customers..."
          emptyMessage="No customers found"
        />
      )}
    </PageLayout>
  )
}
