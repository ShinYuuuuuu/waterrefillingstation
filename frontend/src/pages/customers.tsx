import { useState, useEffect } from 'react'
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
import { FiPlus, FiEdit, FiTrash2, FiEye } from 'react-icons/fi'
import { customerService } from '@/services/customer.service'
import type { Customer, CustomerType, CreateCustomerRequest, UpdateCustomerRequest } from '@/types/customer'
import { useToast } from '@/components/ui/toast'

export function CustomersPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null)
  const [historyPage, setHistoryPage] = useState(1)

  const [formData, setFormData] = useState<{
    customerType: CustomerType
    fullName: string
    phone: string
    companyName?: string | null
    email?: string | null
    tin?: string | null
    creditLimit?: number | string
  }>({
    customerType: 'RETAIL',
    fullName: '',
    phone: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customers', searchQuery, page],
    queryFn: () => customerService.list({ search: searchQuery || undefined, page, limit: 20 }),
  })

  const purchaseSummaryQueries = useQuery({
    queryKey: ['customers', 'purchase-summary', data?.data?.map((c) => c.id)],
    queryFn: async () => {
      if (!data?.data?.length) return {}
      const summaries = await Promise.all(
        data.data.map((c) => customerService.getPurchaseSummary(c.id))
      )
      return Object.fromEntries(summaries.map((s) => [s.customerId, s]))
    },
    enabled: !!data?.data?.length,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['customers', 'sales', historyCustomerId, historyPage],
    queryFn: () => customerService.getSalesHistory(historyCustomerId!, { page: historyPage, limit: 10 }),
    enabled: !!historyCustomerId,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomerRequest) => customerService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsFormOpen(false)
      resetForm()
      addToast({ type: 'success', title: 'Customer created successfully' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to create customer' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerRequest }) =>
      customerService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsFormOpen(false)
      setEditingCustomer(null)
      resetForm()
      addToast({ type: 'success', title: 'Customer updated successfully' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update customer' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setDeleteTargetId(null)
      addToast({ type: 'success', title: 'Customer deleted successfully' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to delete customer' })
      setDeleteTargetId(null)
    },
  })

  const resetForm = () => {
    setFormData({
      customerType: 'RETAIL',
      fullName: '',
      phone: '',
    })
    setFormErrors({})
  }

  const openCreateForm = () => {
    setEditingCustomer(null)
    resetForm()
    setIsFormOpen(true)
  }

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      customerType: customer.customerType,
      fullName: customer.fullName,
      phone: customer.phone,
      companyName: customer.companyName,
      email: customer.email,
      tin: customer.tin,
      creditLimit: customer.creditLimit,
    })
    setFormErrors({})
    setIsFormOpen(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required'
    if (!formData.phone.trim()) errors.phone = 'Phone number is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, payload: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = () => {
    if (deleteTargetId) {
      deleteMutation.mutate(deleteTargetId)
    }
  }

  const customers = data?.data ?? []
  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isDeleting = deleteMutation.isPending

  const columns = [
    {
      key: 'fullName',
      header: 'Customer Name',
      render: (item: Customer) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{item.fullName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{item.phone}</p>
        </div>
      ),
    },
    {
      key: 'customerType',
      header: 'Type',
      render: (item: Customer) => <Badge variant={item.customerType === 'RESELLER' ? 'info' : 'default'}>{item.customerType === 'RESELLER' ? 'Reseller' : 'Regular'}</Badge>,
    },
    {
      key: 'rewards',
      header: 'Free Gallons',
      render: (item: Customer) => (
        <div><strong>{item.freeGallonsBalance}</strong><p className="text-xs text-gray-500">Progress: {item.rewardGallonProgress}/{item.customerType === 'RESELLER' ? '5 gallons' : '10 gallons'}</p></div>
      ),
    },
    {
      key: 'totalPurchases',
      header: 'Total Purchases',
      render: (item: Customer) => purchaseSummaryQueries.data?.[item.id]?.totalPurchases ?? 0,
    },
    {
      key: 'totalGallons',
      header: 'Total Gallons',
      render: (item: Customer) => purchaseSummaryQueries.data?.[item.id]?.totalGallons ?? 0,
    },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      render: (item: Customer) => {
        const spent = purchaseSummaryQueries.data?.[item.id]?.totalSpent ?? 0
        return <span>₱{spent.toFixed(2)}</span>
      },
    },
    {
      key: 'lastPurchase',
      header: 'Last Purchase',
      render: (item: Customer) => {
        const last = purchaseSummaryQueries.data?.[item.id]?.lastPurchase
        return last ? new Date(last).toLocaleDateString() : 'N/A'
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Customer) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setHistoryCustomerId(item.id)}>
            <FiEye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEditForm(item)}>
            <FiEdit className="w-4 h-4" />
          </Button>
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
        title="Customers"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers' },
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
        title="Customers"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers' },
        ]}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">
              {(error as any)?.message || 'Failed to load customers'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Customers"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Customers' },
      ]}
    >
      <div className="flex justify-end">
        <Button onClick={openCreateForm}>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No customers match your search' : 'No customers yet'}
            </p>
            <Button variant="outline" className="mt-4" onClick={openCreateForm}>
              Add your first customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          pagination={pagination}
          onPageChange={setPage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search customers..."
          emptyMessage="No customers found"
        />
      )}

      <Modal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingCustomer(null)
          resetForm()
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Type
              </label>
              <Select
                options={[
                  { value: 'RETAIL', label: 'Retail' },
                  { value: 'RESELLER', label: 'Reseller' },
                  { value: 'CORPORATE', label: 'Corporate' },
                ]}
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter full name"
                error={formErrors.fullName}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone *
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                error={formErrors.phone}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={formData.email ?? ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name
              </label>
              <Input
                value={formData.companyName ?? ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value || null })}
                placeholder="Enter company name (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TIN
              </label>
              <Input
                value={formData.tin ?? ''}
                onChange={(e) => setFormData({ ...formData, tin: e.target.value || null })}
                placeholder="Enter TIN (optional)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Credit Limit
            </label>
            <Input
              type="number"
              value={formData.creditLimit ?? ''}
              onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Enter credit limit"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsFormOpen(false)
                setEditingCustomer(null)
                resetForm()
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {editingCustomer ? 'Update' : 'Create'} Customer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!historyCustomerId}
        onClose={() => {
          setHistoryCustomerId(null)
          setHistoryPage(1)
        }}
        title={
          historyCustomerId
            ? `Purchase History — ${data?.data?.find((c) => c.id === historyCustomerId)?.fullName || 'Customer'}`
            : 'Purchase History'
        }
        size="lg"
      >
        {historyCustomerId && (
          <div className="space-y-4">
            {historyLoading ? (
              <SkeletonTable rows={5} columns={6} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Transaction ID</th>
                      <th className="text-left py-2 px-3">Channel</th>
                      <th className="text-left py-2 px-3">Payment</th>
                      <th className="text-right py-2 px-3">Quantity</th>
                      <th className="text-right py-2 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData?.data?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No purchase history found
                        </td>
                      </tr>
                    ) : (
                      historyData?.data?.map((sale) => (
                        <tr key={sale.id} className="border-b dark:border-gray-700">
                          <td className="py-2 px-3">{new Date(sale.date).toLocaleDateString()}</td>
                          <td className="py-2 px-3 font-mono text-xs">{sale.invoiceNumber}</td>
                          <td className="py-2 px-3">
                            <Badge variant="info">{sale.channel}</Badge>
                          </td>
                          <td className="py-2 px-3">{sale.paymentMethod || 'N/A'}</td>
                          <td className="py-2 px-3 text-right">{sale.quantity}</td>
                          <td className="py-2 px-3 text-right">₱{sale.amount.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {historyData?.meta && historyData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {historyData.meta.page} of {historyData.meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHistoryPage((p) => p + 1)}
                  disabled={historyPage >= historyData.meta.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </PageLayout>
  )
}
