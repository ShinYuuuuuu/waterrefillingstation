import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FiPlus } from 'react-icons/fi'

export function GallonsPage() {
  const [isLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const columns = [
    { key: 'name', header: 'Gallon Type' },
    { key: 'size', header: 'Size' },
    { key: 'price', header: 'Price' },
    { key: 'stock', header: 'Stock' },
    {
      key: 'status',
      header: 'Status',
      render: (item: { status: string }) => (
        <Badge variant={item.status === 'available' ? 'success' : 'warning'}>
          {item.status}
        </Badge>
      ),
    },
  ]

  const data = [
    { id: '1', name: 'Round Water Container', size: '5 Gallon', price: '₱50.00', stock: '150', status: 'available' },
    { id: '2', name: 'Slim Water Container', size: '5 Gallon', price: '₱55.00', stock: '80', status: 'available' },
    { id: '3', name: 'Distilled Water', size: '1 Gallon', price: '₱20.00', stock: '300', status: 'available' },
    { id: '4', name: 'Alkaline Water', size: '5 Gallon', price: '₱60.00', stock: '12', status: 'low_stock' },
  ]

  const filteredData = searchQuery
    ? data.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data

  if (isLoading) {
    return (
      <PageLayout
        title="Gallons"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Gallons' },
        ]}
      >
        <SkeletonTable rows={5} columns={4} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Gallons"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Gallons' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search gallons..."
        />
        <Button>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Gallon Type
        </Button>
      </div>

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No gallon types match your search' : 'No gallon types yet'}
            </p>
            <Button variant="outline" className="mt-4">
              Add gallon type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search gallons..."
          emptyMessage="No gallon types found"
        />
      )}
    </PageLayout>
  )
}
