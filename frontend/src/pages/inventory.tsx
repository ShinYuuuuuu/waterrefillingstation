import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FiPlus } from 'react-icons/fi'

export function InventoryPage() {
  const [isLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const columns = [
    { key: 'product', header: 'Product' },
    { key: 'category', header: 'Category' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'unit', header: 'Unit' },
    {
      key: 'status',
      header: 'Status',
      render: (item: { status: string }) => {
        const variant =
          item.status === 'in_stock'
            ? 'success'
            : item.status === 'low_stock'
            ? 'warning'
            : 'danger'
        return <Badge variant={variant}>{item.status}</Badge>
      },
    },
    { key: 'last_updated', header: 'Last Updated' },
  ]

  const data = [
    { id: '1', product: '5-Gallon Water', category: 'Water', quantity: '150', unit: 'pcs', status: 'in_stock', last_updated: '2026-08-04' },
    { id: '2', product: '1-Gallon Water', category: 'Water', quantity: '300', unit: 'pcs', status: 'in_stock', last_updated: '2026-08-04' },
    { id: '3', product: 'Purifier Filter', category: 'Accessories', quantity: '5', unit: 'pcs', status: 'low_stock', last_updated: '2026-08-03' },
    { id: '4', product: 'Dispenser', category: 'Equipment', quantity: '2', unit: 'pcs', status: 'low_stock', last_updated: '2026-08-02' },
    { id: '5', product: 'Hose Faucet', category: 'Accessories', quantity: '0', unit: 'pcs', status: 'out_of_stock', last_updated: '2026-08-01' },
  ]

  const filteredData = searchQuery
    ? data.filter(
        (item) =>
          item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data

  if (isLoading) {
    return (
      <PageLayout
        title="Inventory"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory' },
        ]}
      >
        <SkeletonTable rows={5} columns={4} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Inventory"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Inventory' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search inventory..."
        />
        <Button>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Stock
        </Button>
      </div>

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No inventory items match your search' : 'No inventory items yet'}
            </p>
            <Button variant="outline" className="mt-4">
              Add inventory item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search inventory..."
          emptyMessage="No inventory items found"
        />
      )}
    </PageLayout>
  )
}
