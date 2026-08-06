import { useState } from 'react'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FiUsers, FiPackage, FiShoppingCart, FiTruck } from 'react-icons/fi'

export function DashboardPage() {
  const [isLoading] = useState(false)

  const stats = [
    {
      title: 'Total Customers',
      value: '1,234',
      description: '+12% from last month',
      trend: 'up' as const,
      trendValue: '+12%',
      icon: <FiUsers className="w-6 h-6" />,
    },
    {
      title: 'Total Products',
      value: '567',
      description: 'Across all categories',
      trend: 'up' as const,
      trendValue: '+5%',
      icon: <FiPackage className="w-6 h-6" />,
    },
    {
      title: 'Today\'s Sales',
      value: '₱45,678',
      description: 'From 89 transactions',
      trend: 'up' as const,
      trendValue: '+8%',
      icon: <FiShoppingCart className="w-6 h-6" />,
    },
    {
      title: 'Active Deliveries',
      value: '23',
      description: 'In progress',
      trend: 'neutral' as const,
      trendValue: '0%',
      icon: <FiTruck className="w-6 h-6" />,
    },
  ]

  if (isLoading) {
    return (
      <PageLayout title="Dashboard" breadcrumbItems={[{ label: 'Dashboard' }]}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="mt-6">
          <SkeletonTable rows={5} columns={4} />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Dashboard"
      breadcrumbItems={[{ label: 'Dashboard' }]}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Transaction #{1000 + i}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Completed</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start">
                <FiShoppingCart className="w-4 h-4 mr-2" />
                New Sale
              </Button>
              <Button variant="outline" className="justify-start">
                <FiTruck className="w-4 h-4 mr-2" />
                New Delivery
              </Button>
              <Button variant="outline" className="justify-start">
                <FiUsers className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
              <Button variant="outline" className="justify-start">
                <FiPackage className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
