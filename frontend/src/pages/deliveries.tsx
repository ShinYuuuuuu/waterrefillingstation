import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { DataTable } from '@/components/ui/data-table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useAuthContext } from '@/contexts/auth-context'
import { deliveryService } from '@/services/delivery.service'
import type {
  DeliveryOrder,
  CreateDeliveryOrderRequest,
  UpdateDeliveryOrderRequest,
  DeliveryOrderStatus,
  RiderOption,
} from '@/types/delivery'
import { FiEdit, FiUserPlus, FiRefreshCw, FiAlertTriangle, FiTruck, FiCheckCircle, FiXCircle } from 'react-icons/fi'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'CASH', label: 'Cash' },
  { value: 'GCASH', label: 'GCash' },
  { value: 'MAYA', label: 'Maya' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHECK', label: 'Check' },
  { value: 'CREDIT', label: 'Credit' },
]

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

function getStatusBadge(status: DeliveryOrderStatus) {
  const variantMap: Record<DeliveryOrderStatus, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
    PENDING: 'warning',
    ASSIGNED: 'info',
    OUT_FOR_DELIVERY: 'info',
    DELIVERED: 'success',
    FAILED: 'danger',
    RETURNED: 'default',
    CANCELLED: 'danger',
  }
  return <Badge variant={variantMap[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>
}

function canEditDelivery(status: DeliveryOrderStatus): boolean {
  return status === 'PENDING' || status === 'ASSIGNED'
}

function getValidNextStatuses(
  current: DeliveryOrderStatus,
  role: string
): DeliveryOrderStatus[] {
  const allowed: DeliveryOrderStatus[] = ['PENDING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED']

  if (role === 'rider') {
    if (current === 'ASSIGNED') return ['OUT_FOR_DELIVERY', 'CANCELLED']
    if (current === 'OUT_FOR_DELIVERY') return ['DELIVERED', 'FAILED', 'CANCELLED']
    return []
  }

  return allowed
}

export function DeliveriesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { user } = useAuthContext()
  const role = user?.role || 'customer'

  const isOwner = role === 'owner'
  const isCashier = role === 'cashier'
  const isRider = role === 'rider'

  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null)

  const [createForm, setCreateForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    orderType: 'ONE_TIME' as 'ONE_TIME' | 'STANDING',
    paymentMethod: '' as string,
    specialInstructions: '',
    items: [{ productId: '', productName: '', quantity: '', unitPrice: '' }],
  })
  const [createError, setCreateError] = useState('')

  const [editForm, setEditForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    paymentMethod: '' as string,
    specialInstructions: '',
  })
  const [editError, setEditError] = useState('')

  const [statusForm, setStatusForm] = useState({ status: 'PENDING' as DeliveryOrderStatus, failureReason: '' })
  const [riderForm, setRiderForm] = useState({ riderId: '' })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['deliveries', searchQuery, page, statusFilter, isRider ? 'assigned' : 'all'],
    queryFn: () => {
      const query: any = { page, limit: 20, search: searchQuery || undefined }
      if (statusFilter) query.status = statusFilter
      if (isRider && user?.id) {
        query.assignedRiderId = user.id
      }
      return deliveryService.list(query)
    },
  })

  const { data: riders } = useQuery({
    queryKey: ['riders'],
    queryFn: () => deliveryService.getRiders({ isActive: true }),
    enabled: (isOwner || isCashier) && (isAssignOpen || isCreateOpen),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateDeliveryOrderRequest) => deliveryService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      addToast({ type: 'success', title: 'Delivery order created' })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to create delivery' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDeliveryOrderRequest }) =>
      deliveryService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      addToast({ type: 'success', title: 'Delivery order updated' })
      setIsEditOpen(false)
      setSelectedOrder(null)
      resetEditForm()
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update delivery' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: DeliveryOrderStatus; failureReason?: string | null } }) =>
      deliveryService.updateStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      addToast({ type: 'success', title: 'Delivery status updated' })
      setIsStatusOpen(false)
      setSelectedOrder(null)
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update status' })
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ id, riderId }: { id: string; riderId: string }) =>
      deliveryService.assignRider(id, { riderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      addToast({ type: 'success', title: 'Rider assigned' })
      setIsAssignOpen(false)
      setSelectedOrder(null)
      setRiderForm({ riderId: '' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to assign rider' })
    },
  })

  const resetCreateForm = () => {
    setCreateForm({
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      orderType: 'ONE_TIME',
      paymentMethod: '',
      specialInstructions: '',
      items: [{ productId: '', productName: '', quantity: '', unitPrice: '' }],
    })
    setCreateError('')
  }

  const resetEditForm = () => {
    setEditForm({
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      paymentMethod: '',
      specialInstructions: '',
    })
    setEditError('')
  }

  const openEdit = (order: DeliveryOrder) => {
    if (!canEditDelivery(order.status)) {
      addToast({ type: 'warning', title: 'Cannot edit delivery in current status' })
      return
    }
    setSelectedOrder(order)
    setEditForm({
      customerId: order.customerId,
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerAddress: order.addressLine || '',
      paymentMethod: order.paymentMethod || '',
      specialInstructions: order.specialInstructions || '',
    })
    setEditError('')
    setIsEditOpen(true)
  }

  const openAssign = (order: DeliveryOrder) => {
    setSelectedOrder(order)
    setRiderForm({ riderId: order.assignedRiderId || '' })
    setIsAssignOpen(true)
  }

  const openStatus = (order: DeliveryOrder) => {
    setSelectedOrder(order)
    setStatusForm({ status: order.status, failureReason: order.failureReason || '' })
    setIsStatusOpen(true)
  }

  const handleCreate = () => {
    if (!createForm.customerName.trim()) {
      setCreateError('Customer name is required')
      return
    }
    if (createForm.items.length === 0 || !createForm.items[0].productName.trim()) {
      setCreateError('At least one item is required')
      return
    }

    setCreateError('')
    const payload: CreateDeliveryOrderRequest = {
      customerId: createForm.customerId || crypto.randomUUID(),
      orderType: createForm.orderType,
      paymentMethod: (createForm.paymentMethod as any) || null,
      specialInstructions: createForm.specialInstructions || null,
      items: createForm.items.map((item) => ({
        productId: item.productId || crypto.randomUUID(),
        productName: item.productName,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
      })),
    }
    createMutation.mutate(payload)
  }

  const handleUpdate = () => {
    if (!selectedOrder) return
    if (!editForm.customerName.trim()) {
      setEditError('Customer name is required')
      return
    }
    setEditError('')
    updateMutation.mutate({
      id: selectedOrder.id,
      payload: {
        paymentMethod: (editForm.paymentMethod as any) || null,
        specialInstructions: editForm.specialInstructions || null,
      },
    })
  }

  const handleStatusUpdate = () => {
    if (!selectedOrder) return
    statusMutation.mutate({
      id: selectedOrder.id,
      payload: {
        status: statusForm.status,
        failureReason: statusForm.failureReason || null,
      },
    })
  }

  const handleAssign = () => {
    if (!selectedOrder || !riderForm.riderId) {
      addToast({ type: 'error', title: 'Please select a rider' })
      return
    }
    assignMutation.mutate({ id: selectedOrder.id, riderId: riderForm.riderId })
  }

  const canUpdateStatus = (order: DeliveryOrder) => {
    if (isOwner || isCashier) return true
    if (isRider) {
      return order.status === 'ASSIGNED' || order.status === 'OUT_FOR_DELIVERY'
    }
    return false
  }

  const validStatusesForOrder = selectedOrder ? getValidNextStatuses(selectedOrder.status, role) : []

  const columns = useMemo(
    () => [
      {
        key: 'orderId',
        header: 'Order ID',
        render: (item: DeliveryOrder) => (
          <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
            {item.id.slice(0, 8)}
          </span>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        render: (item: DeliveryOrder) => (
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.customerName || 'N/A'}</p>
          </div>
        ),
      },
      {
        key: 'address',
        header: 'Address',
        render: (item: DeliveryOrder) => (
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
            {item.addressLine || 'N/A'}
          </span>
        ),
      },
      {
        key: 'items',
        header: 'Items',
        render: (item: DeliveryOrder) => {
          const total = item.items.reduce((sum, i) => sum + i.lineTotal, 0)
          return (
            <div>
              <p className="text-sm text-gray-900 dark:text-white">{item.items.length} item(s)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">₱{total.toFixed(2)}</p>
            </div>
          )
        },
      },
      {
        key: 'rider',
        header: 'Rider',
        render: (item: DeliveryOrder) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {item.assignedRiderName || 'Unassigned'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (item: DeliveryOrder) => getStatusBadge(item.status),
      },
      {
        key: 'updatedAt',
        header: 'Last Updated',
        render: (item: DeliveryOrder) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(item.updatedAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (item: DeliveryOrder) => {
          const editable = canEditDelivery(item.status)
          return (
            <div className="flex items-center gap-2">
              {(isOwner || isCashier) && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(item)}
                    disabled={!editable}
                    title={editable ? 'Edit delivery' : 'Cannot edit in current status'}
                  >
                    <FiEdit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAssign(item)}
                    title="Assign rider"
                  >
                    <FiUserPlus className="w-4 h-4" />
                  </Button>
                </>
              )}
              {isRider && item.status === 'ASSIGNED' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => statusMutation.mutate({ id: item.id, payload: { status: 'OUT_FOR_DELIVERY' } })}
                  title="Start Delivery"
                >
                  <FiTruck className="w-4 h-4" />
                </Button>
              )}
              {isRider && item.status === 'OUT_FOR_DELIVERY' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => statusMutation.mutate({ id: item.id, payload: { status: 'DELIVERED' } })}
                    title="Delivered"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const reason = prompt('Failure reason (optional):') || null
                      statusMutation.mutate({ id: item.id, payload: { status: 'FAILED', failureReason: reason } })
                    }}
                    title="Failed"
                  >
                    <FiXCircle className="w-4 h-4" />
                  </Button>
                </>
              )}
              {canUpdateStatus(item) && validStatusesForOrder.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openStatus(item)}
                  title="Update status"
                >
                  <FiRefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
          )
        },
      },
    ].filter((column) => column.key !== 'actions'),
    [isOwner, isCashier, isRider, canUpdateStatus, validStatusesForOrder]
  )

  const items = data?.data ?? []
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
        title="Deliveries"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Deliveries' },
        ]}
      >
        <SkeletonTable rows={10} columns={8} />
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout
        title="Deliveries"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Deliveries' },
        ]}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FiAlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">Failed to load deliveries</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Deliveries"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Deliveries' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search deliveries..."
          />
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-40"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter ? 'No deliveries match your filters' : 'No deliveries recorded yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          pagination={pagination}
          onPageChange={setPage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search deliveries..."
          emptyMessage="No deliveries found"
        />
      )}

      {/* Create Delivery Modal */}
      <Modal open={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetCreateForm(); }} title="New Delivery Order" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
              <Input
                value={createForm.customerName}
                onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                placeholder="Customer name"
                error={createError && !createForm.customerName ? createError : undefined}
              />
            </div>
            <div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Address *</label>
            <Input
              value={createForm.customerAddress}
              onChange={(e) => setCreateForm({ ...createForm, customerAddress: e.target.value })}
              placeholder="Full address"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Type</label>
              <Select
                options={[
                  { value: 'ONE_TIME', label: 'One Time' },
                  { value: 'STANDING', label: 'Standing Order' },
                ]}
                value={createForm.orderType}
                onChange={(e) => setCreateForm({ ...createForm, orderType: e.target.value as 'ONE_TIME' | 'STANDING' })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
              <Select
                options={PAYMENT_METHOD_OPTIONS}
                value={createForm.paymentMethod}
                onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items</label>
            {createForm.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-5">
                  <Input
                    value={item.productName}
                    onChange={(e) => {
                      const newItems = [...createForm.items]
                      newItems[index] = { ...newItems[index], productName: e.target.value }
                      setCreateForm({ ...createForm, items: newItems })
                    }}
                    placeholder="Product name"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...createForm.items]
                      newItems[index] = { ...newItems[index], quantity: e.target.value }
                      setCreateForm({ ...createForm, items: newItems })
                    }}
                    placeholder="Qty"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const newItems = [...createForm.items]
                      newItems[index] = { ...newItems[index], unitPrice: e.target.value }
                      setCreateForm({ ...createForm, items: newItems })
                    }}
                    placeholder="Price"
                  />
                </div>
                <div className="col-span-2 flex items-center">
                      <span className="text-sm font-medium">
                        ₱{(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}
                      </span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Instructions</label>
            <Input
              value={createForm.specialInstructions}
              onChange={(e) => setCreateForm({ ...createForm, specialInstructions: e.target.value })}
              placeholder="Optional instructions"
            />
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>
              Create Delivery
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Delivery Modal */}
      <Modal open={isEditOpen} onClose={() => { setIsEditOpen(false); setSelectedOrder(null); resetEditForm(); }} title="Edit Delivery Order" size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">Order {selectedOrder.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status: {selectedOrder.status.replace(/_/g, ' ')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
                <Input
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                  error={editError}
                />
              </div>
              <div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <Input
                value={editForm.customerAddress}
                onChange={(e) => setEditForm({ ...editForm, customerAddress: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                <Select
                  options={PAYMENT_METHOD_OPTIONS}
                  value={editForm.paymentMethod}
                  onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Special Instructions</label>
                <Input
                  value={editForm.specialInstructions}
                  onChange={(e) => setEditForm({ ...editForm, specialInstructions: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsEditOpen(false); setSelectedOrder(null); resetEditForm(); }} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} loading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Rider Modal */}
      <Modal open={isAssignOpen} onClose={() => { setIsAssignOpen(false); setSelectedOrder(null); setRiderForm({ riderId: '' }); }} title="Assign Rider" size="md">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">Order {selectedOrder.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current rider: {selectedOrder.assignedRiderName || 'Unassigned'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Rider</label>
              <Select
                options={[
                  { value: '', label: 'Select a rider...' },
                  ...(riders || []).map((r: RiderOption) => ({ value: r.id, label: r.fullName })),
                ]}
                value={riderForm.riderId}
                onChange={(e) => setRiderForm({ ...riderForm, riderId: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsAssignOpen(false); setSelectedOrder(null); setRiderForm({ riderId: '' }); }} disabled={assignMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleAssign} loading={assignMutation.isPending}>
                Assign Rider
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal open={isStatusOpen} onClose={() => { setIsStatusOpen(false); setSelectedOrder(null); }} title="Update Delivery Status" size="md">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">Order {selectedOrder.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current status: {selectedOrder.status.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
              <Select
                options={validStatusesForOrder.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
                value={statusForm.status}
                onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as DeliveryOrderStatus })}
              />
            </div>
            {statusForm.status === 'FAILED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Failure Reason</label>
                <Input
                  value={statusForm.failureReason}
                  onChange={(e) => setStatusForm({ ...statusForm, failureReason: e.target.value })}
                  placeholder="Reason for failure"
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsStatusOpen(false); setSelectedOrder(null); }} disabled={statusMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleStatusUpdate} loading={statusMutation.isPending}>
                Update Status
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  )
}
