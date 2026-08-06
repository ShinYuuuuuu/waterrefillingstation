import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useAuthContext } from '@/contexts/auth-context'
import { salesService } from '@/services/sales.service'
import { inventoryService } from '@/services/inventory.service'
import type { Sale, CreateSaleRequest, SaleChannel, PaymentMethod } from '@/types/sales'
import { FiPlus, FiShoppingCart, FiTruck, FiAlertTriangle, FiDollarSign, FiUsers } from 'react-icons/fi'

const SALE_CHANNELS: { value: SaleChannel; label: string }[] = [
  { value: 'IN_STORE', label: 'Walk-in' },
  { value: 'DELIVERY', label: 'Delivery' },
]

export function CashierDashboard() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { user } = useAuthContext()
  const isCashier = user?.role === 'cashier'

  const [isSaleOpen, setIsSaleOpen] = useState(false)
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false)

  const [saleForm, setSaleForm] = useState({
    channel: 'IN_STORE' as SaleChannel,
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0 }] as CreateSaleRequest['items'],
    payments: [{ amount: 0, method: 'CASH' as PaymentMethod }] as CreateSaleRequest['payments'],
    notes: '',
  })
  const [saleError, setSaleError] = useState('')

  const { data: todaySales, isLoading: salesLoading } = useQuery({
    queryKey: ['sales', 'today'],
    queryFn: () => salesService.list({ page: 1, limit: 10, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] }),
    enabled: isCashier,
  })

  const { data: lowStockAlerts } = useQuery({
    queryKey: ['inventory', 'alerts', 'low-stock'],
    queryFn: () => inventoryService.getLowStockAlerts(),
    enabled: isCashier,
  })

  const createSaleMutation = useMutation({
    mutationFn: (payload: CreateSaleRequest) => salesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      addToast({ type: 'success', title: 'Sale recorded successfully' })
      setIsSaleOpen(false)
      resetSaleForm()
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.details?.[0]?.message || err?.response?.data?.error?.message || 'Failed to record sale'
      addToast({ type: 'error', title: message })
    },
  })

  const resetSaleForm = () => {
    setSaleForm({
      channel: 'IN_STORE',
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0 }],
      payments: [{ amount: 0, method: 'CASH' }],
      notes: '',
    })
    setSaleError('')
  }

  const calculateTotals = () => {
    const subtotal = saleForm.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const totalPaid = saleForm.payments.reduce((sum, p) => sum + p.amount, 0)
    const change = totalPaid - subtotal
    return { subtotal, totalPaid, change }
  }

  const handleCreateSale = () => {
    if (saleForm.items.length === 0) {
      setSaleError('At least one item is required')
      return
    }
    if (saleForm.payments.length === 0 || saleForm.payments[0].amount <= 0) {
      setSaleError('Payment amount is required')
      return
    }

    const { subtotal, totalPaid } = calculateTotals()
    if (totalPaid < subtotal) {
      setSaleError('Insufficient payment amount')
      return
    }

    setSaleError('')
    createSaleMutation.mutate({
      channel: saleForm.channel,
      customerId: saleForm.customerId || null,
      items: saleForm.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      payments: saleForm.payments.map((p) => ({
        amount: p.amount,
        method: p.method,
      })),
      notes: saleForm.notes || null,
    })
  }

  const addItem = () => {
    setSaleForm({
      ...saleForm,
      items: [...saleForm.items, { productId: '', productName: '', quantity: 1, unitPrice: 0 }],
    })
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...saleForm.items]
    ;(newItems[index] as any)[field] = value
    setSaleForm({ ...saleForm, items: newItems })
  }

  const removeItem = (index: number) => {
    setSaleForm({
      ...saleForm,
      items: saleForm.items.filter((_, i) => i !== index),
    })
  }

  const { subtotal, totalPaid, change } = calculateTotals()
  const recentSales = todaySales?.data ?? []
  const isSubmitting = createSaleMutation.isPending

  if (!isCashier) {
    return (
      <PageLayout title="Dashboard" breadcrumbItems={[{ label: 'Dashboard' }]}>
        <Card>
          <CardContent className="py-12">
            <p className="text-red-600 dark:text-red-400">Unauthorized access</p>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Cashier Dashboard" breadcrumbItems={[{ label: 'Dashboard' }]}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Today's Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₱{todaySales?.data?.reduce((sum, s) => sum + s.grandTotal, 0).toFixed(2) ?? '0.00'}
                </p>
              </div>
              <FiDollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{recentSales.length}</p>
              </div>
              <FiShoppingCart className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{lowStockAlerts?.length ?? 0}</p>
              </div>
              <FiAlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
                <p className="text-xs text-red-500 mt-1">Backend delivery API missing</p>
              </div>
              <FiTruck className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => setIsSaleOpen(true)} className="justify-start">
                <FiPlus className="w-4 h-4 mr-2" />
                New Sale
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  addToast({
                    type: 'warning',
                    title: 'Delivery backend missing',
                    description: 'Required: GET/POST /api/v1/delivery/orders, PATCH /api/v1/delivery/orders/:id/status, POST /api/v1/delivery/orders/:id/assign, GET /api/v1/delivery/riders',
                  })
                }}
                className="justify-start"
              >
                <FiTruck className="w-4 h-4 mr-2" />
                New Delivery
              </Button>
              <Button variant="outline" onClick={() => {}} className="justify-start">
                <FiUsers className="w-4 h-4 mr-2" />
                Customers
              </Button>
              <Button variant="outline" onClick={() => {}} className="justify-start">
                <FiShoppingCart className="w-4 h-4 mr-2" />
                Inventory
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Low Stock Warning</h3>
            {lowStockAlerts && lowStockAlerts.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowStockAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.productId} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <div>
                      <p className="text-sm font-medium">{alert.productName}</p>
                      <p className="text-xs text-gray-500">Available: {alert.availableQuantity} / Reorder: {alert.reorderLevel}</p>
                    </div>
                    <Badge variant="warning">Low</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No low stock items</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          {salesLoading ? (
            <SkeletonTable rows={5} columns={4} />
          ) : recentSales.length === 0 ? (
            <p className="text-sm text-gray-500">No transactions today</p>
          ) : (
            <DataTable
              columns={[
                { key: 'invoiceNumber', header: 'Invoice' },
                { key: 'channel', header: 'Channel', render: (item: Sale) => <Badge variant="info">{item.channel}</Badge> },
                { key: 'grandTotal', header: 'Total', render: (item: Sale) => `₱${item.grandTotal.toFixed(2)}` },
                { key: 'status', header: 'Status', render: (item: Sale) => <Badge variant={item.status === 'COMPLETED' ? 'success' : 'warning'}>{item.status}</Badge> },
                { key: 'createdAt', header: 'Time', render: (item: Sale) => new Date(item.createdAt).toLocaleTimeString() },
              ]}
              data={recentSales}
              rowKey="id"
              emptyMessage="No transactions yet"
            />
          )}
        </CardContent>
      </Card>

      {/* New Sale Modal */}
      <Modal open={isSaleOpen} onClose={() => { setIsSaleOpen(false); resetSaleForm(); }} title="New Sale" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
              <Select
                options={SALE_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
                value={saleForm.channel}
                onChange={(e) => setSaleForm({ ...saleForm, channel: e.target.value as SaleChannel })}
              />
            </div>
            {saleForm.channel === 'DELIVERY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
                <Input
                  value={saleForm.customerName}
                  onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
            )}
          </div>

          {saleForm.channel === 'DELIVERY' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <Input
                  value={saleForm.customerPhone}
                  onChange={(e) => setSaleForm({ ...saleForm, customerPhone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <Input
                  value={saleForm.customerAddress}
                  onChange={(e) => setSaleForm({ ...saleForm, customerAddress: e.target.value })}
                  placeholder="Delivery address"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items</label>
            {saleForm.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-4">
                  <Input
                    value={item.productName}
                    onChange={(e) => updateItem(index, 'productName', e.target.value)}
                    placeholder="Product name"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    placeholder="Qty"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                    placeholder="Price"
                  />
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-medium">₱{(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={saleForm.items.length === 1}>
                    ×
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem}>
              Add Item
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Paid</label>
              <Input
                type="number"
                step="0.01"
                value={saleForm.payments[0]?.amount ?? 0}
                onChange={(e) =>
                  setSaleForm({
                    ...saleForm,
                    payments: [{ amount: Number(e.target.value), method: 'CASH' }],
                  })
                }
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <Input
                value={saleForm.notes}
                onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Paid:</span>
              <span className="font-medium">₱{totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Change:</span>
              <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>₱{change.toFixed(2)}</span>
            </div>
          </div>

          {saleError && <p className="text-sm text-red-600">{saleError}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsSaleOpen(false); resetSaleForm(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateSale} loading={isSubmitting}>
              Complete Sale
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Delivery Modal - Backend Missing */}
      <ConfirmDialog
        open={isDeliveryOpen}
        onClose={() => setIsDeliveryOpen(false)}
        onConfirm={() => {
          setIsDeliveryOpen(false)
          addToast({
            type: 'warning',
            title: 'Delivery backend missing',
            description: 'Required endpoints: GET/POST /api/v1/delivery/orders, PATCH /api/v1/delivery/orders/:id/status, POST /api/v1/delivery/orders/:id/assign, GET /api/v1/delivery/riders',
          })
        }}
        title="Delivery Feature Unavailable"
        description="The delivery order management backend is not yet implemented. Required endpoints: GET/POST /api/v1/delivery/orders, PATCH /api/v1/delivery/orders/:id/status, POST /api/v1/delivery/orders/:id/assign, GET /api/v1/delivery/riders"
        confirmText="Acknowledge"
        variant="default"
      />
    </PageLayout>
  )
}
