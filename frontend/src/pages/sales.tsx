import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { salesService } from '@/services/sales.service'
import type { Sale, CreateSaleRequest, SaleChannel, PaymentMethod } from '@/types/sales'
import { FiPlus, FiTrash2 } from 'react-icons/fi'

const SALE_CHANNELS: { value: SaleChannel; label: string }[] = [
  { value: 'IN_STORE', label: 'Walk-in' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'RESELLER', label: 'Reseller' },
]

export function SalesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    channel: 'IN_STORE' as SaleChannel,
    customerId: '',
    items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0 }] as CreateSaleRequest['items'],
    payments: [{ amount: 0, method: 'CASH' as PaymentMethod }] as CreateSaleRequest['payments'],
    notes: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sales', searchQuery, page],
    queryFn: () =>
      salesService.list({
        search: searchQuery || undefined,
        page,
        limit: 20,
      }),
  })

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
      items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0 }],
      payments: [{ amount: 0, method: 'CASH' }],
      notes: '',
    })
    setFormErrors({})
  }

  const openCreateForm = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (formData.items.length === 0) errors.items = 'At least one item is required'
    if (formData.payments.length === 0 || formData.payments[0].amount <= 0) errors.payment = 'Payment amount is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const totalPaid = formData.payments.reduce((sum, p) => sum + p.amount, 0)
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
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      payments: formData.payments.map((p) => ({
        amount: p.amount,
        method: p.method,
      })),
      notes: formData.notes || null,
    })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', productName: '', quantity: 1, unitPrice: 0 }],
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
    { key: 'channel', header: 'Channel', render: (item: Sale) => <Badge variant="info">{item.channel}</Badge> },
    { key: 'grandTotal', header: 'Total', render: (item: Sale) => `₱${item.grandTotal.toFixed(2)}` },
    { key: 'status', header: 'Status', render: (item: Sale) => <Badge variant={item.status === 'COMPLETED' ? 'success' : 'warning'}>{item.status}</Badge> },
    { key: 'createdAt', header: 'Date', render: (item: Sale) => new Date(item.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Sale) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(item.id)}>
            <FiTrash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      ),
    },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search sales..."
        />
        <Button onClick={openCreateForm}>
          <FiPlus className="w-4 h-4 mr-2" />
          New Sale
        </Button>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No sales match your search' : 'No sales recorded yet'}
            </p>
            <Button variant="outline" className="mt-4" onClick={openCreateForm}>
              Record a sale
            </Button>
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
                onChange={(e) => setFormData({ ...formData, channel: e.target.value as SaleChannel })}
              />
            </div>
            {formData.channel === 'DELIVERY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                <Input
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  placeholder="Customer ID or name"
                />
              </div>
            )}
          </div>

          {formData.channel === 'DELIVERY' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <Input
                  value={formData.items[0]?.productName ?? ''}
                  onChange={(e) => updateItem(0, 'productName', e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <Input
                  value={formData.items[0]?.productId ?? ''}
                  onChange={(e) => updateItem(0, 'productId', e.target.value)}
                  placeholder="Address"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items</label>
            {formData.items.map((item, index) => (
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
                value={formData.payments[0]?.amount ?? 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payments: [{ amount: Number(e.target.value), method: 'CASH' }],
                  })
                }
                placeholder="0.00"
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
