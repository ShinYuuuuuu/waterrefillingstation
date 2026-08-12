import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useAuthContext } from '@/contexts/auth-context'
import { deliveryService } from '@/services/delivery.service'
import type { DeliveryOrder, DeliveryOrderStatus } from '@/types/delivery'
import { FiTruck, FiMapPin, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi'

type RiderTab = 'active' | 'completed' | 'failed'

export function RiderDeliveriesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { user } = useAuthContext()

  const [activeTab, setActiveTab] = useState<RiderTab>('active')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['rider', 'deliveries', user?.id, activeTab, searchQuery],
    queryFn: async () => {
      if (!user?.id) return { data: [], meta: { total: 0 } }
      let status: DeliveryOrderStatus | undefined
      if (activeTab === 'completed') status = 'DELIVERED'
      else if (activeTab === 'failed') status = 'FAILED'
      const result = await deliveryService.list({
        assignedRiderId: user.id,
        status,
        page: 1,
        limit: 50,
        search: searchQuery || undefined,
      })
      return result
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, failureReason }: { id: string; status: DeliveryOrderStatus; failureReason?: string | null }) =>
      deliveryService.updateStatus(id, { status, failureReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider', 'deliveries'] })
      addToast({ type: 'success', title: 'Delivery status updated' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update status' })
    },
  })

  const deliveries = data?.data ?? []

  const activeDeliveries = deliveries.filter((d) => d.status === 'ASSIGNED' || d.status === 'OUT_FOR_DELIVERY')
  const completedToday = deliveries.filter((d) => {
    if (d.status !== 'DELIVERED') return false
    const deliveredDate = d.deliveredAt ? new Date(d.deliveredAt).toDateString() : null
    return deliveredDate === new Date().toDateString()
  })
  const failedDeliveries = deliveries.filter((d) => d.status === 'FAILED')

  const applySearch = (items: DeliveryOrder[]) => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter((d) =>
      d.customerName?.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
    )
  }

  const visibleDeliveries = activeTab === 'active'
    ? applySearch(activeDeliveries)
    : activeTab === 'completed'
      ? applySearch(completedToday)
      : applySearch(failedDeliveries)

  const counts = {
    active: activeDeliveries.length,
    completed: completedToday.length,
    failed: failedDeliveries.length,
  }

  const handleStatusUpdate = (order: DeliveryOrder, nextStatus: DeliveryOrderStatus) => {
    const failureReason = nextStatus === 'FAILED' ? prompt('Failure reason (optional):') || null : null
    statusMutation.mutate({ id: order.id, status: nextStatus, failureReason })
  }

  const getActionButton = (order: DeliveryOrder) => {
    if (order.status === 'ASSIGNED') {
      return (
        <Button variant="primary" onClick={() => handleStatusUpdate(order, 'OUT_FOR_DELIVERY')} className="w-full">
          <FiTruck className="w-4 h-4 mr-2" />
          Start Delivery
        </Button>
      )
    }
    if (order.status === 'OUT_FOR_DELIVERY') {
      return (
        <div className="flex gap-2">
          <Button onClick={() => handleStatusUpdate(order, 'DELIVERED')} className="flex-1">
            <FiCheckCircle className="w-4 h-4 mr-2" />
            Delivered
          </Button>
          <Button variant="danger" onClick={() => handleStatusUpdate(order, 'FAILED')} className="flex-1">
            <FiXCircle className="w-4 h-4 mr-2" />
            Failed
          </Button>
        </div>
      )
    }
    return null
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <PageLayout title="Your Deliveries" breadcrumbItems={[{ label: 'Deliveries' }]}>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Your Deliveries" breadcrumbItems={[{ label: 'Deliveries' }]}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by customer or order ID..."
          className="sm:max-w-md"
        />
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'active' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('active')}
          >
            <FiClock className="w-4 h-4 mr-2" />
            Active ({counts.active})
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('completed')}
          >
            <FiCheckCircle className="w-4 h-4 mr-2" />
            Completed Today ({counts.completed})
          </Button>
          <Button
            variant={activeTab === 'failed' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('failed')}
          >
            <FiXCircle className="w-4 h-4 mr-2" />
            Failed ({counts.failed})
          </Button>
        </div>
      </div>

      {activeTab === 'active' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Deliveries</h2>
          {visibleDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FiTruck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No active deliveries match your search' : 'No active deliveries assigned to you'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleDeliveries.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                        #{order.id.slice(0, 8)}
                      </span>
                      <Badge variant={order.status === 'ASSIGNED' ? 'warning' : 'info'}>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <FiMapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customerName || 'N/A'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{order.addressLine || 'No address'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                        <span>Qty: {order.items.reduce((sum, i) => sum + i.quantity, 0)} gallons</span>
                        <span>₱{order.items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Last updated: {formatDate(order.updatedAt)}</p>
                    </div>

                    {getActionButton(order)}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Completed Today</h2>
          {visibleDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FiCheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No completed deliveries match your search' : 'No deliveries completed today'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleDeliveries.map((order) => (
                <Card key={order.id} className="opacity-75">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                        #{order.id.slice(0, 8)}
                      </span>
                      <Badge variant="success">Delivered</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customerName || 'N/A'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.addressLine || 'No address'}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                      <span>Qty: {order.items.reduce((sum, i) => sum + i.quantity, 0)} gallons</span>
                      <span>₱{order.items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500">Delivered at: {formatDate(order.deliveredAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'failed' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Failed Deliveries</h2>
          {visibleDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FiXCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No failed deliveries match your search' : 'No failed deliveries'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleDeliveries.map((order) => (
                <Card key={order.id} className="opacity-75">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                        #{order.id.slice(0, 8)}
                      </span>
                      <Badge variant="danger">Failed</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customerName || 'N/A'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.addressLine || 'No address'}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                      <span>Qty: {order.items.reduce((sum, i) => sum + i.quantity, 0)} gallons</span>
                      <span>₱{order.items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2)}</span>
                    </div>
                    {order.failureReason && (
                      <p className="text-xs text-red-500">Reason: {order.failureReason}</p>
                    )}
                    <p className="text-xs text-gray-500">Last updated: {formatDate(order.updatedAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  )
}
