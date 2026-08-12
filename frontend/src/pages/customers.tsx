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
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi'
import { customerService } from '@/services/customer.service'
import type { Customer, CustomerType, CreateCustomerRequest, UpdateCustomerRequest } from '@/types/customer'
import { useToast } from '@/components/ui/toast'
import { useAuthContext } from '@/contexts/auth-context'
import { inventoryService } from '@/services/inventory.service'

export function CustomersPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { user } = useAuthContext()
  const isOwner = user?.role === 'owner'
  const [customerTab, setCustomerTab] = useState<'all' | 'regular' | 'reseller' | 'lent'>('all')
  const [customerSort, setCustomerSort] = useState<'name' | 'type' | 'recent'>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null)
  const [historyPage, setHistoryPage] = useState(1)
  const [loanForm, setLoanForm] = useState({ productId: '', quantity: '', paymentStatus: 'UNPAID', amount: '', paymentMethod: 'CASH' })
  const [loanError, setLoanError] = useState('')

  const [formData, setFormData] = useState<{
    customerType: CustomerType
    fullName: string
    phone: string
    address: string
  }>({
    customerType: 'RETAIL',
    fullName: '',
    phone: '',
    address: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['customers', searchQuery, page, customerTab],
    queryFn: () => customerService.list({ search: searchQuery || undefined, page: customerTab === 'lent' ? 1 : page, limit: customerTab === 'lent' ? 100 : 20, customerType: customerTab === 'regular' ? 'RETAIL' : customerTab === 'reseller' ? 'RESELLER' : undefined }),
  })

  const { data: inventoryLoans = [] } = useQuery({ queryKey: ['inventory', 'loans'], queryFn: () => inventoryService.listInventoryLoans() })
  const { data: inventoryItems } = useQuery({ queryKey: ['inventory', 'customer-loan-options'], queryFn: () => inventoryService.listBranchInventory({ page: 1, limit: 100 }) })
  const createLoanMutation = useMutation({
    mutationFn: () => inventoryService.createInventoryLoan({
      customerId: historyCustomerId!, productId: loanForm.productId, quantity: Number(loanForm.quantity),
      paid: loanForm.paymentStatus === 'PAID', amount: loanForm.paymentStatus === 'PAID' ? Number(loanForm.amount) : undefined,
      paymentMethod: loanForm.paymentMethod,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setLoanForm({ productId: '', quantity: '', paymentStatus: 'UNPAID', amount: '', paymentMethod: 'CASH' })
      setLoanError('')
      addToast({ type: 'success', title: loanForm.paymentStatus === 'PAID' ? 'Paid gallons recorded as sold' : 'Lent gallons recorded' })
    },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to record gallons' }),
  })
  const resolveLoanMutation = useMutation({
    mutationFn: ({ id, action, amount }: { id: string; action: 'RETURN' | 'SOLD'; amount?: number }) => action === 'RETURN' ? inventoryService.returnInventoryLoan(id) : inventoryService.sellInventoryLoan(id, amount!, 'CASH'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); addToast({ type: 'success', title: 'Lent gallon record updated' }) },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update lent gallons' }),
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
      address: '',
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
      address: typeof customer.metadata?.address === 'string' ? customer.metadata.address : '',
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
    const payload = {
      customerType: formData.customerType,
      fullName: formData.fullName,
      phone: formData.phone,
      metadata: {
        ...(editingCustomer?.metadata ?? {}),
        address: formData.address.trim(),
      },
    }
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = () => {
    if (deleteTargetId) {
      deleteMutation.mutate(deleteTargetId)
    }
  }

  const handleCreateLoan = () => {
    const quantity = Number(loanForm.quantity)
    if (!loanForm.productId || !Number.isInteger(quantity) || quantity < 1) return setLoanError('Select an inventory item and enter a valid quantity')
    if (loanForm.paymentStatus === 'PAID' && (!Number.isFinite(Number(loanForm.amount)) || Number(loanForm.amount) <= 0)) return setLoanError('Enter the amount paid')
    setLoanError('')
    createLoanMutation.mutate()
  }

  const outstandingCustomerIds = new Set(inventoryLoans.filter((loan) => loan.status === 'OUTSTANDING').map((loan) => loan.customer_id))
  const outstandingGallonsFor = (customerId: string) => inventoryLoans
    .filter((loan) => loan.customer_id === customerId && loan.status === 'OUTSTANDING')
    .reduce((total, loan) => total + loan.quantity, 0)
  const customers = [...(data?.data ?? [])].filter((customer) => customerTab !== 'lent' || outstandingCustomerIds.has(customer.id)).sort((a, b) => customerSort === 'type' ? a.customerType.localeCompare(b.customerType) || a.fullName.localeCompare(b.fullName) : customerSort === 'recent' ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() : a.fullName.localeCompare(b.fullName))
  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isDeleting = deleteMutation.isPending

  const columns = [
    {
      key: 'fullName',
      header: 'Customer Name',
      render: (item: Customer) => (
        <div>
          <button
            type="button"
            className="font-medium text-left text-primary-700 hover:underline dark:text-primary-300"
            onClick={(event) => { event.stopPropagation(); setHistoryCustomerId(item.id) }}
          >
            {item.fullName}
          </button>
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
      header: 'Free Refills',
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
      header: 'Total Refills',
      render: (item: Customer) => purchaseSummaryQueries.data?.[item.id]?.totalGallons ?? 0,
    },
    {
      key: 'lentGallons',
      header: 'Lent Gallons',
      render: (item: Customer) => outstandingGallonsFor(item.id),
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
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {([['all', 'All Customers'], ['regular', 'Regular'], ['reseller', 'Resellers'], ['lent', 'Lent Gallons']] as const).map(([value, label]) => (
            <Button key={value} className="w-full whitespace-nowrap sm:w-auto" size="sm" variant={customerTab === value ? 'primary' : 'secondary'} onClick={() => { setCustomerTab(value); setPage(1) }}>{label}</Button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-52">
            <Select className="truncate" aria-label="Sort customers" options={[{ value: 'name', label: 'Name (A–Z)' }, { value: 'type', label: 'Customer type' }, { value: 'recent', label: 'Recently updated' }]} value={customerSort} onChange={(event) => setCustomerSort(event.target.value as typeof customerSort)} />
          </div>
          <Button className="w-full whitespace-nowrap sm:w-auto" onClick={openCreateForm}>
            <FiPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
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
          rowKey="id"
          onRowClick={(customer) => setHistoryCustomerId(customer.id)}
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
                  { value: 'RETAIL', label: 'Regular Customer' },
                  { value: 'RESELLER', label: 'Reseller' },
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
              Address
            </label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter customer address"
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
            ? `Customer Profile — ${data?.data?.find((c) => c.id === historyCustomerId)?.fullName || 'Customer'}`
            : 'Customer Profile'
        }
        size="lg"
      >
        {historyCustomerId && (
          <div className="space-y-4">
            {isOwner && (() => {
              const selectedCustomer = data?.data?.find((customer) => customer.id === historyCustomerId)
              if (!selectedCustomer) return null
              return (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    onClick={() => {
                      setHistoryCustomerId(null)
                      openEditForm(selectedCustomer)
                    }}
                  >
                    <FiEdit className="w-4 h-4 mr-2" /> Edit Customer
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    variant="danger"
                    onClick={() => {
                      setHistoryCustomerId(null)
                      setDeleteTargetId(selectedCustomer.id)
                    }}
                  >
                    <FiTrash2 className="w-4 h-4 mr-2" /> Delete Customer
                  </Button>
                </div>
              )
            })()}
            <div className="rounded-lg border border-primary-200 dark:border-primary-800 p-4 space-y-3">
              <div><h3 className="font-semibold text-gray-900 dark:text-white">Record Gallons for this Customer</h3><p className="text-xs text-gray-500 dark:text-gray-300">Unpaid gallons enter circulation. Paid gallons are immediately recorded as sold.</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Inventory Item</label><Select options={(inventoryItems?.data ?? []).map((item) => ({ value: item.productId, label: `${item.productName} — ${item.quantityOnHand} at shop` }))} value={loanForm.productId} onChange={(event) => setLoanForm({ ...loanForm, productId: event.target.value })} placeholder="Select gallon/container" /></div>
                <div><label className="block text-sm font-medium mb-1">Quantity</label><Input type="number" min="1" step="1" value={loanForm.quantity} onChange={(event) => setLoanForm({ ...loanForm, quantity: event.target.value })} /></div>
                <div><label className="block text-sm font-medium mb-1">Payment Status</label><Select options={[{ value: 'UNPAID', label: 'Unpaid — Lent' }, { value: 'PAID', label: 'Paid — Sold' }]} value={loanForm.paymentStatus} onChange={(event) => setLoanForm({ ...loanForm, paymentStatus: event.target.value })} /></div>
                {loanForm.paymentStatus === 'PAID' && <>
                  <div><label className="block text-sm font-medium mb-1">Amount Paid</label><Input type="number" min="0.01" step="0.01" value={loanForm.amount} onChange={(event) => setLoanForm({ ...loanForm, amount: event.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">Payment Method</label><Select options={[{ value: 'CASH', label: 'Cash' }, { value: 'GCASH', label: 'GCash' }, { value: 'MAYA', label: 'Maya' }, { value: 'BANK_TRANSFER', label: 'Bank Transfer' }]} value={loanForm.paymentMethod} onChange={(event) => setLoanForm({ ...loanForm, paymentMethod: event.target.value })} /></div>
                </>}
              </div>
              {loanError && <p className="text-sm text-red-600 dark:text-red-400">{loanError}</p>}
              <div className="flex justify-end"><Button className="w-full sm:w-auto" onClick={handleCreateLoan} loading={createLoanMutation.isPending}>Record Gallons</Button></div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Lent Gallons ({outstandingGallonsFor(historyCustomerId)} outstanding)</h3>
              <div className="space-y-2">
                {inventoryLoans.filter((loan) => loan.customer_id === historyCustomerId).map((loan) => (
                  <div key={loan.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div><p className="font-medium">{loan.product.name} × {loan.quantity}</p><p className="text-xs text-gray-500 dark:text-gray-300">Lent {new Date(loan.lent_at).toLocaleDateString()} · {loan.status === 'OUTSTANDING' ? 'Unpaid / In Circulation' : loan.status === 'SOLD' ? 'Paid / Sold' : 'Returned'}</p></div>
                    {isOwner && loan.status === 'OUTSTANDING' && <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <Button className="w-full whitespace-nowrap sm:w-auto" size="sm" variant="secondary" onClick={() => resolveLoanMutation.mutate({ id: loan.id, action: 'RETURN' })}>Record Return</Button>
                      <Button className="w-full whitespace-nowrap sm:w-auto" size="sm" onClick={() => {
                        const entered = window.prompt(`Enter total payment for ${loan.quantity} ${loan.product.name}:`)
                        if (entered === null) return
                        const amount = Number(entered)
                        if (!Number.isFinite(amount) || amount <= 0) return addToast({ type: 'error', title: 'Enter a valid payment amount' })
                        resolveLoanMutation.mutate({ id: loan.id, action: 'SOLD', amount })
                      }}>Mark Paid / Sold</Button>
                    </div>}
                  </div>
                ))}
                {!inventoryLoans.some((loan) => loan.customer_id === historyCustomerId) && <p className="text-sm text-gray-500 dark:text-gray-300">No lent gallon records.</p>}
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Purchase History</h3>
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
