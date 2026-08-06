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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { gallonService } from '@/services/gallon.service'
import type { GallonItem, CreateGallonRequest, UpdateGallonRequest } from '@/types/gallon'
import { FiPlus, FiEdit, FiTrash2, FiRefreshCw } from 'react-icons/fi'

const STATUS_OPTIONS = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'WITH_CUSTOMER', label: 'With Customer' },
  { value: 'WITH_RIDER', label: 'With Rider' },
  { value: 'WITH_RESELLER', label: 'With Reseller' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LOST', label: 'Lost' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'FILLED', label: 'Filled' },
] as const

const HOLDER_TYPE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'rider', label: 'Rider' },
  { value: 'reseller', label: 'Reseller' },
  { value: 'branch', label: 'Branch' },
]

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

function getStatusBadge(status: string) {
  const variant =
    status === 'IN_STOCK'
      ? 'success'
      : status === 'LOST' || status === 'RETIRED' || status === 'DAMAGED'
        ? 'danger'
        : status === 'WITH_CUSTOMER' || status === 'WITH_RIDER' || status === 'WITH_RESELLER' || status === 'FILLED'
          ? 'info'
          : 'warning'
  return <Badge variant={variant}>{status.replace(/_/g, ' ')}</Badge>
}

export function GallonsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedGallon, setSelectedGallon] = useState<GallonItem | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const [createForm, setCreateForm] = useState({
    gallonTypeId: '',
    tagCode: '',
    serialNumber: '',
    status: 'IN_STOCK',
    holderType: '',
    holderId: '',
    purchasePrice: '',
    purchaseDate: '',
  })
  const [createError, setCreateError] = useState('')

  const [editForm, setEditForm] = useState({
    tagCode: '',
    serialNumber: '',
    holderType: '',
    holderId: '',
    purchasePrice: '',
    isActive: true,
  })
  const [editError, setEditError] = useState('')

  const [statusForm, setStatusForm] = useState({ status: 'IN_STOCK', notes: '' })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['gallons', searchQuery, page, statusFilter],
    queryFn: () =>
      gallonService.listGallons({
        page,
        limit: 20,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateGallonRequest) => gallonService.createGallon(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallons'] })
      addToast({ type: 'success', title: 'Gallon created successfully' })
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to create gallon' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGallonRequest }) =>
      gallonService.updateGallon(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallons'] })
      addToast({ type: 'success', title: 'Gallon updated successfully' })
      setIsEditOpen(false)
      setSelectedGallon(null)
      resetEditForm()
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update gallon' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string | null }) =>
      gallonService.updateGallonStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallons'] })
      addToast({ type: 'success', title: 'Gallon status updated' })
      setIsStatusOpen(false)
      setSelectedGallon(null)
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update status' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gallonService.deleteGallon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallons'] })
      addToast({ type: 'success', title: 'Gallon deleted successfully' })
      setIsDeleteOpen(false)
      setSelectedGallon(null)
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to delete gallon' })
    },
  })

  const resetCreateForm = () => {
    setCreateForm({
      gallonTypeId: '',
      tagCode: '',
      serialNumber: '',
      status: 'IN_STOCK',
      holderType: '',
      holderId: '',
      purchasePrice: '',
      purchaseDate: '',
    })
    setCreateError('')
  }

  const resetEditForm = () => {
    setEditForm({
      tagCode: '',
      serialNumber: '',
      holderType: '',
      holderId: '',
      purchasePrice: '',
      isActive: true,
    })
    setEditError('')
  }

  const handleCreate = () => {
    if (!createForm.gallonTypeId || !createForm.tagCode) {
      setCreateError('Gallon type and tag code are required')
      return
    }
    setCreateError('')
    createMutation.mutate({
      gallonTypeId: createForm.gallonTypeId,
      tagCode: createForm.tagCode,
      serialNumber: createForm.serialNumber || null,
      status: createForm.status,
      holderType: createForm.holderType || null,
      holderId: createForm.holderId || null,
      purchasePrice: createForm.purchasePrice ? Number(createForm.purchasePrice) : null,
      purchaseDate: createForm.purchaseDate || null,
      isActive: true,
    })
  }

  const handleUpdate = () => {
    if (!selectedGallon) return
    if (!editForm.tagCode) {
      setEditError('Tag code is required')
      return
    }
    setEditError('')
    updateMutation.mutate({
      id: selectedGallon.id,
      payload: {
        tagCode: editForm.tagCode,
        serialNumber: editForm.serialNumber || null,
        holderType: editForm.holderType || null,
        holderId: editForm.holderId || null,
        purchasePrice: editForm.purchasePrice ? Number(editForm.purchasePrice) : null,
        isActive: editForm.isActive,
      },
    })
  }

  const handleStatusUpdate = () => {
    if (!selectedGallon) return
    statusMutation.mutate({
      id: selectedGallon.id,
      status: statusForm.status,
      notes: statusForm.notes || null,
    })
  }

  const openEdit = (gallon: GallonItem) => {
    setSelectedGallon(gallon)
    setEditForm({
      tagCode: gallon.tagCode,
      serialNumber: gallon.serialNumber || '',
      holderType: gallon.currentHolderType || '',
      holderId: gallon.currentHolderId || '',
      purchasePrice: gallon.purchasePrice?.toString() || '',
      isActive: gallon.isActive,
    })
    setEditError('')
    setIsEditOpen(true)
  }

  const openStatus = (gallon: GallonItem) => {
    setSelectedGallon(gallon)
    setStatusForm({ status: gallon.status, notes: '' })
    setIsStatusOpen(true)
  }

  const columns = useMemo(
    () => [
      {
        key: 'tagCode',
        header: 'Tag Code',
        render: (item: GallonItem) => (
          <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{item.tagCode}</span>
        ),
      },
      {
        key: 'serialNumber',
        header: 'Serial Number',
        render: (item: GallonItem) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">{item.serialNumber || 'N/A'}</span>
        ),
      },
      {
        key: 'gallonTypeId',
        header: 'Gallon Type',
        render: (item: GallonItem) => (
          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{item.gallonTypeId.slice(0, 8)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (item: GallonItem) => getStatusBadge(item.status),
      },
      {
        key: 'assignment',
        header: 'Assignment',
        render: (item: GallonItem) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {item.currentHolderType ? `${item.currentHolderType} (${item.currentHolderId?.slice(0, 8) || 'N/A'})` : 'Unassigned'}
          </span>
        ),
      },
      {
        key: 'lastUpdated',
        header: 'Last Updated',
        render: (item: GallonItem) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(item.updatedAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (item: GallonItem) => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
              <FiEdit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openStatus(item)}>
              <FiRefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedGallon(item); setIsDeleteOpen(true); }}>
              <FiTrash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        ),
      },
    ],
    [],
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
        title="Gallons"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Gallons' },
        ]}
      >
        <SkeletonTable rows={10} columns={7} />
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout
        title="Gallons"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Gallons' },
        ]}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">Failed to load gallons</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Gallons"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Gallons' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by tag code or serial number..."
        />
        <div className="flex items-center gap-2">
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-40"
          />
          <Button onClick={() => { resetCreateForm(); setIsCreateOpen(true); }}>
            <FiPlus className="w-4 h-4 mr-2" />
            Add Gallon
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter ? 'No gallons match your filters' : 'No gallons yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          pagination={pagination}
          rowKey="id"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search gallons..."
          emptyMessage="No gallons found"
        />
      )}

      {/* Create Modal */}
      <Modal open={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetCreateForm(); }} title="Register New Gallon" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gallon Type ID *</label>
              <Input
                value={createForm.gallonTypeId}
                onChange={(e) => setCreateForm({ ...createForm, gallonTypeId: e.target.value })}
                placeholder="Gallon type UUID"
                error={createError && !createForm.gallonTypeId ? createError : undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tag Code *</label>
              <Input
                value={createForm.tagCode}
                onChange={(e) => setCreateForm({ ...createForm, tagCode: e.target.value })}
                placeholder="e.g. AQUA-RND-0001"
                error={createError && !createForm.tagCode ? createError : undefined}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
              <Input
                value={createForm.serialNumber}
                onChange={(e) => setCreateForm({ ...createForm, serialNumber: e.target.value })}
                placeholder="Optional serial number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <Select
                options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                value={createForm.status}
                onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Holder Type</label>
              <Select
                options={HOLDER_TYPE_OPTIONS}
                value={createForm.holderType}
                onChange={(e) => setCreateForm({ ...createForm, holderType: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Holder ID</label>
              <Input
                value={createForm.holderId}
                onChange={(e) => setCreateForm({ ...createForm, holderId: e.target.value })}
                placeholder="Optional holder UUID"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price</label>
              <Input
                type="number"
                value={createForm.purchasePrice}
                onChange={(e) => setCreateForm({ ...createForm, purchasePrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label>
              <Input
                type="date"
                value={createForm.purchaseDate}
                onChange={(e) => setCreateForm({ ...createForm, purchaseDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setIsCreateOpen(false); resetCreateForm(); }} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>
              Create Gallon
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={isEditOpen} onClose={() => { setIsEditOpen(false); setSelectedGallon(null); resetEditForm(); }} title="Edit Gallon" size="lg">
        {selectedGallon && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">{selectedGallon.tagCode}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status: {selectedGallon.status.replace(/_/g, ' ')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tag Code *</label>
                <Input
                  value={editForm.tagCode}
                  onChange={(e) => setEditForm({ ...editForm, tagCode: e.target.value })}
                  error={editError}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                <Input
                  value={editForm.serialNumber}
                  onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Holder Type</label>
                <Select
                  options={HOLDER_TYPE_OPTIONS}
                  value={editForm.holderType}
                  onChange={(e) => setEditForm({ ...editForm, holderType: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Holder ID</label>
                <Input
                  value={editForm.holderId}
                  onChange={(e) => setEditForm({ ...editForm, holderId: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price</label>
                <Input
                  type="number"
                  value={editForm.purchasePrice}
                  onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsEditOpen(false); setSelectedGallon(null); resetEditForm(); }} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} loading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal open={isStatusOpen} onClose={() => { setIsStatusOpen(false); setSelectedGallon(null); }} title="Update Status" size="md">
        {selectedGallon && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">{selectedGallon.tagCode}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current status: {selectedGallon.status.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
              <Select
                options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                value={statusForm.status}
                onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <Input
                value={statusForm.notes}
                onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                placeholder="Optional notes for this status change"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsStatusOpen(false); setSelectedGallon(null); }} disabled={statusMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleStatusUpdate} loading={statusMutation.isPending}>
                Update Status
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setSelectedGallon(null); }}
        onConfirm={() => selectedGallon && deleteMutation.mutate(selectedGallon.id)}
        title="Delete Gallon"
        description={
          selectedGallon
            ? `Are you sure you want to delete gallon "${selectedGallon.tagCode}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </PageLayout>
  )
}
