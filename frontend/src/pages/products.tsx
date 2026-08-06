import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FiPlus } from 'react-icons/fi'

export function ProductsPage() {
  const [isLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const columns = [
    { key: 'name', header: 'Product Name' },
    { key: 'sku', header: 'SKU' },
    {
      key: 'category',
      header: 'Category',
      render: (item: { category: string }) => (
        <Badge variant="info">{item.category}</Badge>
      ),
    },
    { key: 'price', header: 'Price' },
    { key: 'stock', header: 'Stock' },
    {
      key: 'status',
      header: 'Status',
      render: (item: { status: string }) => (
        <Badge variant={item.status === 'active' ? 'success' : 'danger'}>
          {item.status}
        </Badge>
      ),
    },
  ]

  const data = [
    { id: '1', name: '5-Gallon Water', sku: 'WTR-001', category: 'Water', price: '₱50.00', stock: '150', status: 'active' },
    { id: '2', name: '1-Gallon Water', sku: 'WTR-002', category: 'Water', price: '₱20.00', stock: '300', status: 'active' },
    { id: '3', name: 'Purifier Filter', sku: 'ACC-001', category: 'Accessories', price: '₱500.00', stock: '25', status: 'active' },
    { id: '4', name: 'Dispenser', sku: 'EQP-001', category: 'Equipment', price: '₱2,500.00', stock: '10', status: 'active' },
  ]

  const filteredData = searchQuery
    ? data.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data

  if (isLoading) {
    return (
      <PageLayout
        title="Products"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products' },
        ]}
      >
        <SkeletonTable rows={5} columns={4} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Products"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Products' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products..."
        />
        <Button>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No products match your search' : 'No products yet'}
            </p>
            <Button variant="outline" className="mt-4">
              Add your first product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search products..."
          emptyMessage="No products found"
        />
      )}
    </PageLayout>
  )
}
