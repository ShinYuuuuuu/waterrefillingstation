import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { salesService } from '@/services/sales.service'
import { customerService } from '@/services/customer.service'
import { productService } from '@/services/product.service'
import { useAuthContext } from '@/contexts/auth-context'
import type { Sale, CreateSaleRequest, SaleChannel, PaymentMethod } from '@/types/sales'
import { FiTrash2 } from 'react-icons/fi'

const SALE_CHANNELS: { value: SaleChannel; label: string }[] = [
  { value: 'IN_STORE', label: 'Walk-in' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'RESELLER', label: 'Reseller' },
]

export function SalesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { user } = useAuthContext()
  const canCreateSale = user?.role === 'cashier'
  const isOwner = user?.role === 'owner'
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [productFilter, setProductFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    channel: 'IN_STORE' as SaleChannel,
    customerId: '',
    customerSearch: '',
    items: [{ productId: '', productName: '', quantity: '', unitPrice: '' }],
    payments: [{ amount: '', method: 'CASH' as PaymentMethod }],
    notes: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const { data: customerSearchData } = useQuery({
    queryKey: ['customers', 'search', formData.customerSearch],
    queryFn: () => customerService.list({ search: formData.customerSearch, page: 1, limit: 5 }),
    enabled: formData.channel === 'DELIVERY' && formData.customerSearch.length >= 2,
  })

  const { data: productOptions } = useQuery({
    queryKey: ['products', 'sale-options'],
    queryFn: () => productService.list({ page: 1, limit: 100, isActive: true }),
    enabled: canCreateSale,
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sales', searchQuery, productFilter, page],
    queryFn: () =>
      salesService.list({
        search: searchQuery || undefined,
        page,
        limit: 20,
        productId: productFilter || undefined,
      }),
  })

  const { data: salesProducts } = useQuery({
    queryKey: ['products', 'sales-filter'],
    queryFn: () => productService.list({ page: 1, limit: 100, isActive: true }),
  })

  const { data: incomeTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['sales', 'income-trends'],
    queryFn: salesService.incomeTrends,
    enabled: isOwner,
  })

  const reportData = incomeTrends?.[reportPeriod] ?? []
  const reportSummary = useMemo(() => reportData.reduce((summary, point) => ({
    revenue: summary.revenue + point.total,
    transactions: summary.transactions + point.transactions,
  }), { revenue: 0, transactions: 0 }), [reportData])
  const reportMaximum = Math.max(...reportData.map((point) => point.total), 1)

  const createMutation = useMutation({
    mutationFn: (payload: CreateSaleRequest) => salesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setIsFormOpen(false)
      resetForm()
      addToast({ type: 'success', title: 'Sale created successfully' })
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.details?.[0]?.message || err?.response?.data?.error?.message || 'Failed to create sale'
      addToast({ type: 'error', title: message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.list({ page: 1, limit: 1, search: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setDeleteTargetId(null)
      addToast({ type: 'success', title: 'Sale deleted successfully' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to delete sale' })
    },
  })

  const resetForm = () => {
    setFormData({
      channel: 'IN_STORE',
      customerId: '',
      customerSearch: '',
      items: [{ productId: '', productName: '', quantity: '', unitPrice: '' }],
      payments: [{ amount: '', method: 'CASH' }],
      notes: '',
    })
    setFormErrors({})
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (formData.items.length === 0) errors.items = 'At least one item is required'
    if (formData.items.some((item) => !item.productId || Number(item.quantity) <= 0)) errors.items = 'Select a product and enter a quantity for every line'
    if (formData.payments.length === 0 || Number(formData.payments[0].amount) <= 0) errors.payment = 'Payment amount is required'
    if (formData.channel === 'DELIVERY' && !formData.customerId) errors.customer = 'Please select an existing customer'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
    const totalPaid = formData.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const change = totalPaid - subtotal
    return { subtotal, totalPaid, change }
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    const { subtotal, totalPaid } = calculateTotals()
    if (totalPaid < subtotal) {
      addToast({ type: 'error', title: 'Insufficient payment amount' })
      return
    }
    createMutation.mutate({
      channel: formData.channel,
      customerId: formData.customerId || null,
      items: formData.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
      })),
      payments: formData.payments.map((p) => ({
        amount: Number(p.amount) || 0,
        method: p.method,
      })),
      notes: formData.notes || null,
    })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', productName: '', quantity: '', unitPrice: '' }],
    })
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items]
    ;(newItems[index] as any)[field] = value
    setFormData({ ...formData, items: newItems })
  }

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const { subtotal, totalPaid, change } = calculateTotals()
  const sales = data?.data ?? []
  const isSubmitting = createMutation.isPending
  const isDeleting = deleteMutation.isPending

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice' },
    { key: 'customerName', header: 'Customer' },
    { key: 'cashierName', header: 'Cashier' },
    { key: 'channel', header: 'Sale Type', render: (item: Sale) => <Badge variant="info">{item.channel === 'IN_STORE' ? 'Walk-in' : 'Delivery'}</Badge> },
    { key: 'items', header: 'Products Sold', render: (item: Sale) => <div className="space-y-1">{item.items.map((line) => <p key={line.id} className="text-sm">{line.productName} × {line.quantity}</p>)}</div> },
    { key: 'grandTotal', header: 'Total', render: (item: Sale) => `₱${item.grandTotal.toFixed(2)}` },
    { key: 'status', header: 'Status', render: (item: Sale) => <Badge variant={item.status === 'COMPLETED' ? 'success' : 'warning'}>{item.status}</Badge> },
    { key: 'createdAt', header: 'Date', render: (item: Sale) => new Date(item.createdAt).toLocaleDateString() },
    ...(canCreateSale ? [{
      key: 'actions',
      header: 'Actions',
      render: (item: Sale) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(item.id)}>
            <FiTrash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      ),
    }] : []),
  ]

  const pagination = data?.meta
    ? {
        page: data.meta.page,
        pageSize: data.meta.limit,
        totalItems: data.meta.total,
        totalPages: data.meta.totalPages,
      }
    : undefined

  if (isLoading) {
    return (
      <PageLayout
        title="Sales"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sales' },
        ]}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="mt-6">
          <SkeletonTable rows={5} columns={6} />
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout
        title="Sales"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sales' },
        ]}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">
              {(error as any)?.message || 'Failed to load sales'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Sales"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales' },
      ]}
    >
      {isOwner && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sales Tracking</h2>
              <p className="text-sm text-gray-500">Compare completed sales by day, week, or month.</p>
            </div>
            <div className="w-full sm:w-52">
              <Select
                aria-label="Sales report period"
                options={[
                  { value: 'daily', label: 'Daily — 7 days' },
                  { value: 'weekly', label: 'Weekly — 8 weeks' },
                  { value: 'monthly', label: 'Monthly — 12 months' },
                ]}
                value={reportPeriod}
                onChange={(event) => setReportPeriod(event.target.value as 'daily' | 'weekly' | 'monthly')}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent><p className="text-sm text-gray-500">Period Revenue</p><p className="mt-1 text-2xl font-bold">₱{reportSummary.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></CardContent></Card>
            <Card><CardContent><p className="text-sm text-gray-500">Transactions</p><p className="mt-1 text-2xl font-bold">{reportSummary.transactions}</p></CardContent></Card>
            <Card><CardContent><p className="text-sm text-gray-500">Average Sale</p><p className="mt-1 text-2xl font-bold">₱{(reportSummary.transactions ? reportSummary.revenue / reportSummary.transactions : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>{reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Sales</CardTitle></CardHeader>
            <CardContent>
              {trendsLoading ? <div className="h-56 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" /> : (
                <div className="overflow-x-auto pb-1">
                  <div className={reportData.length > 8 ? 'min-w-[42rem]' : 'min-w-[28rem]'}>
                    <div className="h-56 flex items-end gap-3 border-b border-gray-200 dark:border-gray-700 pt-8">
                      {reportData.map((point) => (
                        <div key={point.label} className="flex-1 h-full flex flex-col justify-end items-center min-w-0">
                          <span className="text-[10px] font-semibold whitespace-nowrap text-gray-900 dark:text-white">₱{point.total.toLocaleString('en-PH')}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-200 mb-1">{point.transactions} sale{point.transactions === 1 ? '' : 's'}</span>
                          <div className="w-full max-w-12 rounded-t bg-primary-500 min-h-[2px]" style={{ height: `${Math.max((point.total / reportMaximum) * 100, point.total > 0 ? 4 : 1)}%` }} title={`${point.label}: ₱${point.total.toFixed(2)} from ${point.transactions} transactions`} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-2">{reportData.map((point) => <span key={point.label} className="flex-1 min-w-0 text-center text-[10px] text-gray-500 truncate">{point.label}</span>)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <div className="mb-4 flex flex-col gap-1 sm:ml-auto sm:w-72">
        <label htmlFor="sales-product-filter" className="text-sm font-medium text-gray-700 dark:text-gray-200">Filter by product or service</label>
        <Select
          id="sales-product-filter"
          className="truncate"
          options={[{ value: '', label: 'All products and services' }, ...(salesProducts?.data ?? []).map((product) => ({ value: product.id, label: product.name }))]}
          value={productFilter}
          onChange={(event) => { setProductFilter(event.target.value); setPage(1) }}
        />
      </div>
      {sales.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No sales match your search' : 'No sales recorded yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={sales}
          pagination={pagination}
          onPageChange={setPage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search sales..."
          emptyMessage="No sales found"
        />
      )}

      {/* Create Sale Modal */}
      <Modal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          resetForm()
        }}
        title="New Sale"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
              <Select
                options={SALE_CHANNELS.map((c) => ({ value: c.value, label: c.label }))}
                value={formData.channel}
                onChange={(e) => {
                  const channel = e.target.value as SaleChannel
                  const items = formData.items.map((item) => {
                    const product = productOptions?.data.find((option) => option.id === item.productId)
                    if (!product) return item
                    return { ...item, unitPrice: String(product.basePrice) }
                  })
                  setFormData({ ...formData, channel, items })
                }}
              />
            </div>
            {formData.channel === 'DELIVERY' && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                <Input
                  value={formData.customerSearch || formData.customerId}
                  onChange={(e) => {
                    setFormData({ ...formData, customerSearch: e.target.value, customerId: '' })
                    setShowCustomerDropdown(true)
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  placeholder="Search existing customer..."
                />
                {showCustomerDropdown && customerSearchData?.data?.length ? (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {customerSearchData.data.map((customer) => (
                      <div
                        key={customer.id}
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                        onMouseDown={() => {
                          setFormData({ ...formData, customerId: customer.id, customerSearch: customer.fullName })
                          setShowCustomerDropdown(false)
                        }}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">{customer.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{customer.phone}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items</label>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-4">
                  <Select
                    options={(productOptions?.data ?? []).map((product) => ({ value: product.id, label: `${product.name} — ₱${Number(product.basePrice).toFixed(2)}` }))}
                    value={item.productId}
                    onChange={(event) => {
                      const product = productOptions?.data.find((option) => option.id === event.target.value)
                      if (!product) return
                      const newItems = [...formData.items]
                      newItems[index] = { ...newItems[index], productId: product.id, productName: product.name, unitPrice: String(product.basePrice) }
                      setFormData({ ...formData, items: newItems })
                    }}
                    placeholder="Select product"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <div className="col-span-3">
                  <div className="h-10 flex items-center px-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm">₱{Number(item.unitPrice || 0).toFixed(2)} each</div>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-medium">₱{(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}</span>
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={formData.items.length === 1}>
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
                value={formData.payments[0]?.amount ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payments: [{ amount: e.target.value, method: 'CASH' }],
                  })
                }
                placeholder="Enter amount paid"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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

          {formErrors.items && <p className="text-sm text-red-600">{formErrors.items}</p>}
          {formErrors.payment && <p className="text-sm text-red-600">{formErrors.payment}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsFormOpen(false); resetForm(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              Create Sale
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
        title="Delete Sale"
        description="Are you sure you want to delete this sale? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </PageLayout>
  )
}
