import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useAuthContext } from '@/contexts/auth-context'
import { salesService } from '@/services/sales.service'
import { deliveryService } from '@/services/delivery.service'
import { customerService } from '@/services/customer.service'
import { productService } from '@/services/product.service'
import { inventoryService } from '@/services/inventory.service'
import type { Sale, CreateSaleRequest, SaleChannel } from '@/types/sales'
import type { DeliveryOrder } from '@/types/delivery'
import { FiShoppingCart, FiTruck, FiAlertTriangle, FiDollarSign, FiClipboard, FiSearch } from 'react-icons/fi'

const SALE_CHANNELS: { value: SaleChannel; label: string }[] = [
  { value: 'IN_STORE', label: 'Walk-in' },
  { value: 'DELIVERY', label: 'Delivery' },
]

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'GCASH', label: 'GCash' },
  { value: 'MAYA', label: 'Maya' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'ON_ACCOUNT', label: 'On Account' },
]

export function CashierDashboard() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { user } = useAuthContext()
  const isCashier = user?.role === 'cashier'

  const [isSaleOpen, setIsSaleOpen] = useState(false)

  const [saleType, setSaleType] = useState<SaleChannel>('IN_STORE')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [quantity, setQuantity] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [saleError, setSaleError] = useState('')

  const customerDropdownRef = useRef<HTMLDivElement>(null)

  const { data: todaySales, isLoading: salesLoading } = useQuery({
    queryKey: ['sales', 'today'],
    queryFn: () => {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      return salesService.list({
        page: 1,
        limit: 100,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })
    },
    enabled: isCashier,
    refetchInterval: 60000,
  })

  const { data: lowStockAlerts } = useQuery({
    queryKey: ['inventory', 'alerts', 'low-stock'],
    queryFn: () => inventoryService.getLowStockAlerts(),
    enabled: isCashier,
  })

  const { data: pendingDeliveries } = useQuery({
    queryKey: ['deliveries', 'pending'],
    queryFn: () => deliveryService.list({ status: 'PENDING', limit: 10 }),
    enabled: isCashier,
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'search', customerSearch],
    queryFn: () => customerService.list({ search: customerSearch || undefined, limit: 10 }),
    enabled: isSaleOpen && customerSearch.length > 0,
  })

  const { data: allProducts } = useQuery({
    queryKey: ['products', 'all-active'],
    queryFn: () => productService.list({ isActive: true, limit: 100 }),
    enabled: isSaleOpen,
  })

  const customers = customersData?.data ?? []
  const allActiveProducts = allProducts?.data ?? []

  const refillProducts = allActiveProducts.filter((product) => product.type !== 'SERVICE')
  const refillProduct = refillProducts.find((product) => product.id === selectedProductId) ?? refillProducts[0] ?? null
  const refillPrice = Number(refillProduct?.basePrice ?? 0)
  const unitPrice = refillPrice + (saleType === 'DELIVERY' ? 5 : 0)
  const subtotal = Number(quantity || 0) * unitPrice
  const change = Number(amountPaid) - subtotal

  const createSaleMutation = useMutation({
    mutationFn: async (payload: CreateSaleRequest) => {
      return salesService.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      addToast({ type: 'success', title: 'Sale recorded successfully' })
      setIsSaleOpen(false)
      resetForm()
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.details?.[0]?.message || err?.response?.data?.error?.message || 'Failed to record sale'
      addToast({ type: 'error', title: message })
    },
  })

  const resetForm = () => {
    setSaleType('IN_STORE')
    setCustomerSearch('')
    setSelectedCustomerId(null)
    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
    setQuantity('')
      setSelectedProductId('')
    setPaymentMethod('CASH')
    setAmountPaid('')
    setSaleError('')
  }

  const handleSaveSale = async () => {
    setSaleError('')

    if (!refillProduct) {
      setSaleError('No refill product configured. Please contact administrator.')
      return
    }
    if (!quantity || Number(quantity) < 1) {
      setSaleError('Gallons must be at least 1')
      return
    }
    if (!amountPaid || Number(amountPaid) <= 0) {
      setSaleError('Amount paid is required')
      return
    }
    if (Number(amountPaid) < subtotal) {
      setSaleError('Amount paid must be at least the total')
      return
    }

    let customerId = selectedCustomerId
    const trimmedName = customerName.trim()

    if (trimmedName && !customerId) {
      // Search for existing customer by exact case-insensitive name match
      const searchResult = await customerService.list({ search: trimmedName, limit: 10 })
      const exactMatch = searchResult.data.find((c) => c.fullName.toLowerCase() === trimmedName.toLowerCase())

      if (exactMatch) {
        customerId = exactMatch.id
        setSelectedCustomerId(customerId)
      } else {
        // Create new customer
        try {
          const newCustomer = await customerService.create({
            fullName: trimmedName,
            phone: customerPhone.trim() || `N/A-${Date.now()}`,
            customerType: 'RETAIL',
          })
          customerId = newCustomer.id
          setSelectedCustomerId(newCustomer.id)
        } catch (err: any) {
          addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to create customer' })
          return
        }
      }
    }

    if (saleType === 'DELIVERY' && !customerId) {
      setSaleError('Customer name is required for delivery')
      return
    }

    createSaleMutation.mutate({
      channel: saleType,
      customerId: customerId || null,
      items: [
        {
          productId: refillProduct.id,
          productName: refillProduct.name,
          quantity: Number(quantity) || 0,
          unitPrice,
        },
      ],
      payments: [
        {
          amount: Number(amountPaid) || 0,
          method: paymentMethod as any,
        },
      ],
      notes: saleType === 'DELIVERY' ? customerAddress.trim() || null : null,
    })
  }

  // Daily figures reset by date range, not by deleting sales. Historical
  // records stay available to the owner and in the Sales page.
  const recentSales = (todaySales?.data ?? []).filter((sale) => sale.createdBy === user?.id)
  const pendingDeliveriesList = pendingDeliveries?.data ?? []

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
      {/* Primary Actions */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div
          className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary-200 dark:border-primary-800 rounded-xl"
          onClick={() => setIsSaleOpen(true)}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/30">
                  <FiShoppingCart className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Sale</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Start a walk-in or delivery transaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
              <FiClipboard className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingDeliveriesList.length}</p>
              </div>
              <FiTruck className="w-8 h-8 text-yellow-500" />
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
              <FiAlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
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

        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Low Stock Warning</h3>
            {lowStockAlerts && lowStockAlerts.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
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

      {/* Pending Deliveries */}
      {pendingDeliveriesList.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4">Pending Deliveries</h3>
            <DataTable
              columns={[
                { key: 'id', header: 'Order ID', render: (item: DeliveryOrder) => item.id.slice(0, 8) },
                { key: 'customerName', header: 'Customer', render: (item: DeliveryOrder) => item.customerName || 'N/A' },
                { key: 'addressLine', header: 'Address', render: (item: DeliveryOrder) => item.addressLine || 'N/A' },
                { key: 'assignedRiderName', header: 'Rider', render: (item: DeliveryOrder) => item.assignedRiderName || 'Unassigned' },
                { key: 'status', header: 'Status', render: (item: DeliveryOrder) => <Badge variant="warning">{item.status}</Badge> },
              ]}
              data={pendingDeliveriesList}
              rowKey="id"
              emptyMessage="No pending deliveries"
            />
          </CardContent>
        </Card>
      )}

      {/* New Sale Modal */}
      <Modal open={isSaleOpen} onClose={() => { setIsSaleOpen(false); resetForm(); }} title="New Sale" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product *</label>
              <Select
                options={refillProducts.map((product) => ({ value: product.id, label: product.name }))}
                value={refillProduct?.id ?? ''}
                onChange={(event) => setSelectedProductId(event.target.value)}
                placeholder="Select product"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sale Type *</label>
              <Select
                options={SALE_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
                value={saleType}
                onChange={(e) => setSaleType(e.target.value as SaleChannel)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method *</label>
              <Select
                options={PAYMENT_METHODS}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer Name {saleType === 'DELIVERY' ? '*' : ''}
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  setCustomerSearch(e.target.value)
                  setSelectedCustomerId(null)
                }}
                placeholder="Search existing customer or type new name"
                className="pl-10"
              />
            </div>
            {customers.length > 0 && customerSearch && !selectedCustomerId && (
              <div
                ref={customerDropdownRef}
                className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => {
                      setSelectedCustomerId(customer.id)
                      setCustomerName(customer.fullName)
                      setCustomerSearch('')
                    }}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{customer.fullName}</p>
                    <p className="text-xs text-gray-500">{customer.phone}</p>
                  </div>
                ))}
              </div>
            )}
            {saleType === 'DELIVERY' && !customerName && (
              <p className="text-xs text-red-600 mt-1">Customer name is required for delivery</p>
            )}
          </div>

          {saleType === 'DELIVERY' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Delivery address"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">How many gallons? *</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter gallons"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Refill Price</label>
              <div className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white">
                ₱{refillPrice.toFixed(2)} / gallon
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {saleType === 'DELIVERY' ? '₱20 refill + ₱5 delivery per gallon' : '₱20 per gallon'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Paid *</label>
            <Input
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Enter amount paid"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Total:</span>
              <span className="font-medium">₱{Number(subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Amount Paid:</span>
              <span className="font-medium">₱{Number(amountPaid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Change:</span>
              <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>₱{Number(change).toFixed(2)}</span>
            </div>
          </div>

          {saleError && <p className="text-sm text-red-600">{saleError}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsSaleOpen(false); resetForm(); }} disabled={createSaleMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveSale} loading={createSaleMutation.isPending}>
              Save Sale
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  )
}
