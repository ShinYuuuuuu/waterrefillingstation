import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FiFileText } from 'react-icons/fi'

export function ReportsPage() {
  const [isLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const columns = [
    { key: 'name', header: 'Report Name' },
    { key: 'type', header: 'Type' },
    { key: 'date_range', header: 'Date Range' },
    {
      key: 'status',
      header: 'Status',
      render: (item: { status: string }) => (
        <Badge variant={item.status === 'ready' ? 'success' : 'info'}>
          {item.status}
        </Badge>
      ),
    },
    { key: 'generated_at', header: 'Generated' },
  ]

  const data = [
    { id: '1', name: 'Daily Sales Report', type: 'Sales', date_range: 'Aug 1 - Aug 4, 2026', status: 'ready', generated_at: '2026-08-04' },
    { id: '2', name: 'Weekly Inventory Report', type: 'Inventory', date_range: 'Jul 28 - Aug 3, 2026', status: 'ready', generated_at: '2026-08-03' },
    { id: '3', name: 'Monthly Revenue Report', type: 'Financial', date_range: 'July 2026', status: 'processing', generated_at: '2026-08-04' },
    { id: '4', name: 'Customer Summary', type: 'CRM', date_range: 'Jan - Aug 2026', status: 'ready', generated_at: '2026-08-02' },
  ]

  const filteredData = searchQuery
    ? data.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data

  if (isLoading) {
    return (
      <PageLayout
        title="Reports"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports' },
        ]}
      >
        <SkeletonTable rows={5} columns={4} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Reports"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Reports' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search reports..."
        />
        <Button>
          <FiFileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No reports match your search' : 'No reports generated yet'}
            </p>
            <Button variant="outline" className="mt-4">
              Generate your first report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search reports..."
          emptyMessage="No reports found"
        />
      )}
    </PageLayout>
  )
}
