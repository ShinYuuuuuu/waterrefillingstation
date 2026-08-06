import { useState, useEffect } from 'react'
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
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi'
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
    { key: 'fullName', header: 'Customer Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'customerType',
      header: 'Type',
      render: (item: Customer) => (
        <Badge variant={item.customerType === 'RETAIL' ? 'info' : 'secondary'}>
          {item.customerType}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (item: Customer) => new Date(item.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Customer) => (
        <div className="flex items-center gap-2">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search customers..."
        />
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
              placeholder="0.00"
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
