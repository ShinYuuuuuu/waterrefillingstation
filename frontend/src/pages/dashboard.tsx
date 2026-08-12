import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { customerService } from '@/services/customer.service'
import { salesService } from '@/services/sales.service'
import { inventoryService } from '@/services/inventory.service'
import { maintenanceService } from '@/services/maintenance.service'
import { FiUsers, FiTool, FiShoppingCart, FiAlertTriangle } from 'react-icons/fi'

const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const compactCurrency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  notation: 'compact',
  maximumFractionDigits: 1,
})

function IncomeChart({ title, subtitle, data }: { title: string; subtitle: string; data: { label: string; total: number }[] }) {
  const maximum = Math.max(...data.map((point) => point.total), 1)
  return (
    <Card>
      <CardHeader className="mb-2 sm:mb-4">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div className={data.length > 8 ? 'min-w-[38rem]' : 'min-w-[24rem]'}>
            <div className="h-36 sm:h-52 flex items-end gap-2 border-b border-gray-200 dark:border-gray-700 pt-6">
              {data.map((point) => (
                <div key={point.label} className="group flex-1 h-full flex flex-col justify-end items-center min-w-0">
                  <div className="text-[10px] font-semibold mb-1 whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {compactCurrency.format(point.total)}
                  </div>
                  <div
                    className="w-full max-w-10 rounded-t bg-primary-500 hover:bg-primary-600 transition-all min-h-[2px]"
                    style={{ height: `${Math.max((point.total / maximum) * 100, point.total > 0 ? 4 : 1)}%` }}
                    title={`${point.label}: ${currency.format(point.total)}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {data.map((point) => <span key={point.label} className="flex-1 min-w-0 text-center text-[10px] text-gray-500 truncate">{point.label}</span>)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const today = new Date().toISOString().slice(0, 10)
  const customers = useQuery({ queryKey: ['dashboard', 'customers'], queryFn: () => customerService.list({ page: 1, limit: 1 }) })
  const maintenance = useQuery({ queryKey: ['dashboard', 'maintenance'], queryFn: maintenanceService.list })
  const summary = useQuery({ queryKey: ['dashboard', 'sales', today], queryFn: () => salesService.dailySummary(today) })
  const recentSales = useQuery({ queryKey: ['dashboard', 'recent-sales'], queryFn: () => salesService.list({ page: 1, limit: 5 }) })
  const lowStock = useQuery({ queryKey: ['dashboard', 'low-stock'], queryFn: () => inventoryService.getLowStockAlerts() })
  const trends = useQuery({ queryKey: ['dashboard', 'income-trends'], queryFn: salesService.incomeTrends })
  const isLoading = customers.isLoading || maintenance.isLoading || summary.isLoading || recentSales.isLoading || lowStock.isLoading || trends.isLoading

  const maintenanceAttention = (maintenance.data?.schedules ?? []).filter((item) => {
    if (item.due) return true
    if (item.triggerType === 'DAYS' && item.nextDueAt) {
      const millisecondsRemaining = new Date(item.nextDueAt).getTime() - Date.now()
      return millisecondsRemaining >= 0 && millisecondsRemaining <= 2 * 86400000
    }
    return item.gallonInterval !== null
      && item.gallonsRemaining !== null
      && item.gallonsRemaining <= Math.max(1, Math.ceil(item.gallonInterval * 0.2))
  })

  const stats = [
    { title: "Today's Sales", href: '/sales', value: currency.format(summary.data?.totalSales ?? 0), description: `${summary.data?.totalTransactions ?? 0} transactions`, trend: 'neutral' as const, trendValue: '', icon: <FiShoppingCart className="w-6 h-6" /> },
    { title: 'Customers', href: '/customers', value: String(customers.data?.meta.total ?? 0), description: 'Registered customers', trend: 'neutral' as const, trendValue: '', icon: <FiUsers className="w-6 h-6" /> },
    { title: 'Maintenance', href: '/maintenance', value: String(maintenanceAttention.length), description: maintenanceAttention.length ? 'Tasks due or approaching' : 'No tasks need attention', trend: (maintenanceAttention.length ? 'down' : 'neutral') as 'down' | 'neutral', trendValue: '', icon: <FiTool className="w-6 h-6" /> },
    { title: 'Inventory', href: '/inventory', value: String(lowStock.data?.length ?? 0), description: 'Items needing attention', trend: (lowStock.data?.length ? 'down' : 'neutral') as 'down' | 'neutral', trendValue: '', icon: <FiAlertTriangle className="w-6 h-6" /> },
  ]
  const chartOptions = {
    daily: { title: 'Daily Sales', subtitle: 'Income for the last 7 days', data: trends.data?.daily ?? [] },
    weekly: { title: 'Weekly Sales', subtitle: 'Income for the last 8 weeks', data: trends.data?.weekly ?? [] },
    monthly: { title: 'Monthly Sales', subtitle: 'Compare income across the last 12 months', data: trends.data?.monthly ?? [] },
  }
  const selectedChart = chartOptions[salesPeriod]

  if (isLoading) {
    return <PageLayout title="Dashboard" breadcrumbItems={[{ label: 'Dashboard' }]}><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}</div><div className="mt-6"><SkeletonTable rows={5} columns={4} /></div></PageLayout>
  }

  return (
    <PageLayout title="Dashboard" breadcrumbItems={[{ label: 'Dashboard' }]}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {stats.map(({ href, ...stat }) => (
          <Link key={stat.title} to={href} className="rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500">
            <StatCard {...stat} compactOnMobile className="h-full min-h-24 cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md sm:min-h-0" />
          </Link>
        ))}
      </div>
      <div className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
        <div className="flex flex-col gap-1 sm:ml-auto sm:w-56 sm:gap-2">
          <label htmlFor="dashboard-sales-period" className="text-sm font-medium text-gray-700 dark:text-gray-200">View sales by</label>
          <Select
            id="dashboard-sales-period"
            aria-label="View dashboard sales by period"
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={salesPeriod}
            onChange={(event) => setSalesPeriod(event.target.value as typeof salesPeriod)}
          />
        </div>
        <IncomeChart title={selectedChart.title} subtitle={selectedChart.subtitle} data={selectedChart.data} />
      </div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:mt-6 sm:gap-4">
        <Card>
          <CardHeader className="mb-2 sm:mb-4"><CardTitle className="text-base sm:text-lg">Recent Sales</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(recentSales.data?.data ?? []).length === 0 ? <p className="text-sm text-gray-500">No sales recorded yet.</p> : recentSales.data?.data.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">{sale.invoiceNumber}</p><p className="text-xs text-gray-500">{sale.customerName} · {sale.cashierName} · {sale.channel === 'IN_STORE' ? 'Walk-in' : 'Delivery'}</p></div>
                <div className="text-right"><p className="text-sm font-semibold">{currency.format(sale.grandTotal)}</p><Badge variant="success">{sale.status}</Badge></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="mb-2 sm:mb-4"><CardTitle className="text-base sm:text-lg">Low Inventory</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(lowStock.data ?? []).length === 0 ? <p className="text-sm text-green-600">All inventory is above its reorder level.</p> : lowStock.data?.map((item) => (
              <div key={`${item.branchId}-${item.productId}`} className="flex items-center justify-between rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3">
                <div><p className="text-sm font-medium">{item.productName}</p><p className="text-xs text-gray-500">{item.branchName}</p></div>
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">{item.availableQuantity} left</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
