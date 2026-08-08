import { useState, useMemo } from 'react'
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
import { apiClient } from '@/api/client'
import { inventoryService } from '@/services/inventory.service'
import { productService } from '@/services/product.service'
import { gallonService } from '@/services/gallon.service'
import type {
  InventoryItem,
  LedgerEntry,
  StockCountSession,
  AdjustmentRequest,
  InventoryUpdateRequest,
} from '@/types/inventory'
import { FiEdit, FiFileText, FiCheckCircle, FiAlertTriangle, FiRefreshCw, FiPlus } from 'react-icons/fi'

export function InventoryPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { user } = useAuthContext()
  const isOwner = user?.role === 'owner'

  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isStockCountOpen, setIsStockCountOpen] = useState(false)
  const [isNotifyOpen, setIsNotifyOpen] = useState(false)
  const [isUpdateCountOpen, setIsUpdateCountOpen] = useState(false)
  const [isStillLowOpen, setIsStillLowOpen] = useState(false)
  const [isPendingApprovalsOpen, setIsPendingApprovalsOpen] = useState(false)

  const [adjustForm, setAdjustForm] = useState({ quantity: '', reason: 'MANUAL' as AdjustmentRequest['reason'], notes: '' })
  const [adjustError, setAdjustError] = useState('')
  const [updateCountForm, setUpdateCountForm] = useState({ quantity: '', notes: '' })
  const [updateCountError, setUpdateCountError] = useState('')
  const [addInventoryForm, setAddInventoryForm] = useState({ productId: '', quantityOnHand: '' })
  const [addInventoryError, setAddInventoryError] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', 'branch', searchQuery, page, lowStockOnly],
    queryFn: () => inventoryService.listBranchInventory({ page, limit: 20, search: searchQuery || undefined, lowStock: lowStockOnly || undefined }),
  })

  const { data: lowStockAlerts } = useQuery({
    queryKey: ['inventory', 'alerts', 'low-stock'],
    queryFn: () => inventoryService.getLowStockAlerts(),
    enabled: isOwner,
  })

  const { data: availableProducts } = useQuery({
    queryKey: ['products', 'inventory-options'],
    queryFn: () => productService.list({ page: 1, limit: 100, isActive: true }),
    enabled: isOwner && isAddInventoryOpen,
  })

  const { data: gallonSummary } = useQuery({
    queryKey: ['gallons', 'inventory-summary'],
    queryFn: async () => {
      const statuses = ['IN_STOCK', 'WITH_CUSTOMER', 'WITH_RIDER', 'WITH_RESELLER', 'DAMAGED', 'LOST']
      const results = await Promise.all(
        statuses.map((status) => gallonService.listGallons({ page: 1, limit: 1, status })),
      )
      const totals = Object.fromEntries(statuses.map((status, index) => [status, results[index].meta.total]))
      const inCirculation = totals.WITH_CUSTOMER + totals.WITH_RIDER + totals.WITH_RESELLER
      return {
        atShop: totals.IN_STOCK,
        inCirculation,
        damaged: totals.DAMAGED,
        lost: totals.LOST,
        totalOwned: totals.IN_STOCK + inCirculation + totals.DAMAGED + totals.LOST,
      }
    },
    enabled: isOwner,
  })

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['inventory', 'ledger', selectedItem?.productId],
    queryFn: () => inventoryService.listLedgerEntries({ page: 1, limit: 20, productId: selectedItem?.productId }),
    enabled: isHistoryOpen && !!selectedItem?.productId,
  })

  const { data: stockCountSessions, refetch: refetchStockCounts } = useQuery({
    queryKey: ['inventory', 'stock-counts', 'pending'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: any[] }>('/inventory/stock-counts')
      return (response.data.data ?? []).filter((s: any) => s.status === 'SUBMITTED')
    },
    enabled: isStockCountOpen && isOwner,
  })

  const { data: pendingRequests, refetch: refetchPendingRequests } = useQuery({
    queryKey: ['inventory', 'update-requests', 'pending'],
    queryFn: () => inventoryService.listInventoryUpdateRequests({ status: 'PENDING', page: 1, limit: 50 }),
    enabled: isOwner,
  })

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustmentRequest) => inventoryService.createAdjustment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      addToast({ type: 'success', title: 'Stock adjusted successfully' })
      setIsAdjustOpen(false)
      setSelectedItem(null)
      setAdjustForm({ quantity: '', reason: 'MANUAL', notes: '' })
      setAdjustError('')
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to adjust stock' })
    },
  })

  const addInventoryMutation = useMutation({
    mutationFn: () => inventoryService.createBranchInventory({
      productId: addInventoryForm.productId,
      quantityOnHand: Number(addInventoryForm.quantityOnHand),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setIsAddInventoryOpen(false)
      setAddInventoryForm({ productId: '', quantityOnHand: '' })
      setAddInventoryError('')
      addToast({ type: 'success', title: 'Inventory added successfully' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to add inventory' })
    },
  })

  const handleAddInventory = () => {
    const quantity = Number(addInventoryForm.quantityOnHand)
    if (!addInventoryForm.productId || !Number.isInteger(quantity) || quantity < 0) {
      setAddInventoryError('Select a product and enter a valid whole-number quantity')
      return
    }
    setAddInventoryError('')
    addInventoryMutation.mutate()
  }

  const notifyMutation = useMutation({
    mutationFn: () => Promise.resolve({ success: true }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Low-stock notice sent to owner' })
      setIsNotifyOpen(false)
      setSelectedItem(null)
    },
  })

  const updateCountMutation = useMutation({
    mutationFn: (payload: { productId: string; requestedQuantity: number; notes?: string | null }) =>
      inventoryService.createInventoryUpdateRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      addToast({ type: 'success', title: 'Update request submitted for owner approval' })
      setIsUpdateCountOpen(false)
      setSelectedItem(null)
      setUpdateCountForm({ quantity: '', notes: '' })
      setUpdateCountError('')
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to submit update request' })
    },
  })

  const stillLowMutation = useMutation({
    mutationFn: (payload: { productId: string; requestedQuantity: number; notes?: string | null }) =>
      inventoryService.createInventoryUpdateRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      addToast({ type: 'success', title: 'Low-stock report submitted' })
      setIsStillLowOpen(false)
      setSelectedItem(null)
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to submit low-stock report' })
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ requestId, approvedQuantity, notes }: { requestId: string; approvedQuantity: number; notes?: string | null }) =>
      inventoryService.approveInventoryUpdateRequest(requestId, approvedQuantity, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      refetchPendingRequests()
      addToast({ type: 'success', title: 'Update request approved' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to approve request' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, notes }: { requestId: string; notes?: string | null }) =>
      inventoryService.rejectInventoryUpdateRequest(requestId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      refetchPendingRequests()
      addToast({ type: 'success', title: 'Update request rejected' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to reject request' })
    },
  })

  const handleAdjust = () => {
    if (!selectedItem) return
    const qty = Number(adjustForm.quantity)
    if (isNaN(qty) || qty === 0) {
      setAdjustError('Please enter a valid quantity')
      return
    }
    if (adjustForm.reason === 'MANUAL' && qty < 0 && Math.abs(qty) > selectedItem.quantityOnHand) {
      setAdjustError('Cannot reduce below zero')
      return
    }
    setAdjustError('')
    adjustMutation.mutate({
      productId: selectedItem.productId,
      quantity: qty,
      reason: adjustForm.reason,
      notes: adjustForm.notes || null,
    })
  }

  const handleNotify = () => {
    if (!selectedItem) return
    notifyMutation.mutate()
  }

  const handleUpdateCount = () => {
    if (!selectedItem) return
    const qty = Number(updateCountForm.quantity)
    if (isNaN(qty) || qty < 0) {
      setUpdateCountError('Please enter a valid quantity')
      return
    }
    setUpdateCountError('')
    updateCountMutation.mutate({
      productId: selectedItem.productId,
      requestedQuantity: qty,
      notes: updateCountForm.notes || null,
    })
  }

  const handleStillLow = () => {
    if (!selectedItem) return
    stillLowMutation.mutate({
      productId: selectedItem.productId,
      requestedQuantity: selectedItem.quantityOnHand,
      notes: 'Still low - needs replenishment',
    })
  }

  const handleApprove = (request: InventoryUpdateRequest) => {
    const approvedQuantity = request.approvedQuantity ?? request.requestedQuantity
    approveMutation.mutate({ requestId: request.id, approvedQuantity, notes: request.notes })
  }

  const handleReject = (request: InventoryUpdateRequest) => {
    rejectMutation.mutate({ requestId: request.id, notes: request.notes })
  }

  const getStatusBadge = (item: InventoryItem) => {
    const available = item.availableQuantity
    if (available <= 0) return <Badge variant="danger">Out of Stock</Badge>
    if (available <= item.reorderLevel) return <Badge variant="warning">Low Stock</Badge>
    return <Badge variant="success">In Stock</Badge>
  }

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="warning">Pending</Badge>
      case 'APPROVED': return <Badge variant="success">Approved</Badge>
      case 'REJECTED': return <Badge variant="danger">Rejected</Badge>
      case 'RESOLVED': return <Badge variant="default">Resolved</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const columns = useMemo(() => [
    { key: 'productName', header: 'Product', render: (item: InventoryItem) => (
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{item.productSku}</p>
      </div>
    )},
    { key: 'quantityOnHand', header: 'On Hand', render: (item: InventoryItem) => (
      <div>
        <p className="font-medium">{item.quantityOnHand}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Available: {item.availableQuantity}</p>
      </div>
    )},
    { key: 'reorderLevel', header: 'Reorder Level' },
    {
      key: 'status',
      header: 'Status',
      render: (item: InventoryItem) => getStatusBadge(item),
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      render: (item: InventoryItem) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {item.lastCountedAt ? new Date(item.lastCountedAt).toLocaleDateString() : new Date(item.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: InventoryItem) => {
        const isLowStock = item.availableQuantity <= item.reorderLevel
        return (
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setIsAdjustOpen(true); setAdjustForm({ quantity: '', reason: 'MANUAL', notes: '' }); setAdjustError(''); }}>
                  <FiEdit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setIsHistoryOpen(true); refetchHistory(); }}>
                  <FiFileText className="w-4 h-4" />
                </Button>
              </>
            )}
            {!isOwner && (
              <>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setIsUpdateCountOpen(true); setUpdateCountForm({ quantity: '', notes: '' }); setUpdateCountError(''); }}>
                  <FiRefreshCw className="w-4 h-4" />
                </Button>
                {isLowStock && (
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setIsStillLowOpen(true); }}>
                    <FiAlertTriangle className="w-4 h-4 text-yellow-600" />
                  </Button>
                )}
              </>
            )}
          </div>
        )
      },
    },
  ], [isOwner, adjustMutation, refetchHistory])

  const items = data?.data ?? []
  const pagination = data?.meta
    ? {
        page: data.meta.page,
        pageSize: data.meta.limit,
        totalItems: data.meta.total,
        totalPages: data.meta.totalPages,
        onPageChange: setPage,
      }
    : undefined

  if (isLoading) {
    return (
      <PageLayout
        title="Inventory"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory' },
        ]}
      >
        <SkeletonTable rows={10} columns={6} />
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout
        title="Inventory"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory' },
        ]}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FiAlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">Failed to load inventory</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Inventory"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Inventory' },
      ]}
    >
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <Select
            options={[
              { value: 'all', label: 'All Items' },
              { value: 'low', label: 'Low Stock Only' },
            ]}
            value={lowStockOnly ? 'low' : 'all'}
            onChange={(e) => { setLowStockOnly(e.target.value === 'low'); setPage(1); }}
            className="w-40"
          />
          {isOwner && (
            <Button onClick={() => setIsAddInventoryOpen(true)}>
              <FiPlus className="w-4 h-4 mr-2" />
              Add Inventory
            </Button>
          )}
          {isOwner && (
            <Button onClick={() => setIsStockCountOpen(true)}>
              <FiCheckCircle className="w-4 h-4 mr-2" />
              Approve Counts
            </Button>
          )}
          {isOwner && (
            <Button variant="secondary" onClick={() => setIsPendingApprovalsOpen(true)}>
              Pending Approvals
            </Button>
          )}
        </div>
      </div>

      {isOwner && gallonSummary && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ['Total Gallons', gallonSummary.totalOwned],
            ['At the Shop', gallonSummary.atShop],
            ['In Circulation', gallonSummary.inCirculation],
            ['Damaged', gallonSummary.damaged],
            ['Lost', gallonSummary.lost],
          ].map(([label, value]) => (
            <Card key={String(label)}>
              <CardContent className="py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {lowStockAlerts && lowStockAlerts.length > 0 && (
        <Card className="mt-4 border-yellow-200 dark:border-yellow-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <FiAlertTriangle className="w-5 h-5" />
              <span className="font-medium">{lowStockAlerts.length} low-stock item{lowStockAlerts.length > 1 ? 's' : ''} detected</span>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || lowStockOnly ? 'No inventory items match your filters' : 'No inventory items yet'}
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
          searchPlaceholder="Search inventory..."
          emptyMessage="No inventory items found"
        />
      )}

      <Modal open={isAddInventoryOpen} onClose={() => setIsAddInventoryOpen(false)} title="Add Inventory" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product or service</label>
            <Select
              options={(availableProducts?.data ?? []).map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))}
              value={addInventoryForm.productId}
              onChange={(event) => setAddInventoryForm({ ...addInventoryForm, productId: event.target.value })}
              placeholder="Select a product"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opening quantity</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={addInventoryForm.quantityOnHand}
              onChange={(event) => setAddInventoryForm({ ...addInventoryForm, quantityOnHand: event.target.value })}
              error={addInventoryError}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsAddInventoryOpen(false)}>Cancel</Button>
            <Button onClick={handleAddInventory} loading={addInventoryMutation.isPending}>Add Inventory</Button>
          </div>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={isAdjustOpen} onClose={() => { setIsAdjustOpen(false); setSelectedItem(null); }} title="Adjust Stock" size="md">
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">{selectedItem.productName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current on hand: {selectedItem.quantityOnHand}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available: {selectedItem.availableQuantity}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Change</label>
                <Input
                  type="number"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  placeholder="Enter quantity change"
                  error={adjustError}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use negative values to deduct stock</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <Select
                  options={[
                    { value: 'MANUAL', label: 'Manual Adjustment' },
                    { value: 'OPENING_BALANCE', label: 'Opening Balance' },
                    { value: 'DAMAGE', label: 'Damage' },
                    { value: 'EXPIRED', label: 'Expired' },
                    { value: 'LOST', label: 'Lost' },
                  ]}
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value as AdjustmentRequest['reason'] })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <Input
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsAdjustOpen(false); setSelectedItem(null); }} disabled={adjustMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleAdjust} loading={adjustMutation.isPending}>
                Save Adjustment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal open={isHistoryOpen} onClose={() => { setIsHistoryOpen(false); setSelectedItem(null); }} title="Stock History" size="lg">
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">{selectedItem.productName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedItem.productSku}</p>
            </div>
            {historyData?.data.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No history records found</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {historyData?.data.map((entry: LedgerEntry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.movementType}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{entry.notes}</p>
                      <p className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-sm font-medium ${entry.quantityDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.quantityDelta >= 0 ? '+' : ''}{entry.quantityDelta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Stock Count Approval Modal */}
      <Modal open={isStockCountOpen} onClose={() => { setIsStockCountOpen(false); }} title="Pending Stock Counts" size="lg">
        <div className="space-y-4">
          {!stockCountSessions || stockCountSessions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No pending stock count sessions</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stockCountSessions.map((session: StockCountSession) => (
                <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Session {session.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(session.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge variant="warning">{session.status}</Badge>
                  </div>
                  <div className="space-y-1 mb-3">
                    {session.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Product {item.productId.slice(0, 8)}</span>
                        <span className={`font-medium ${item.variance > 0 ? 'text-green-600' : item.variance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          Variance: {item.variance > 0 ? '+' : ''}{item.variance}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await inventoryService.approveStockCount(session.id)
                        queryClient.invalidateQueries({ queryKey: ['inventory'] })
                        refetchStockCounts()
                        addToast({ type: 'success', title: 'Stock count approved' })
                      } catch (err: any) {
                        addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to approve' })
                      }
                    }}
                  >
                    Approve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Update Count Modal */}
      <Modal open={isUpdateCountOpen} onClose={() => { setIsUpdateCountOpen(false); setSelectedItem(null); }} title="Update Count" size="md">
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white">{selectedItem.productName}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current on hand: {selectedItem.quantityOnHand}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available: {selectedItem.availableQuantity}</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">This request requires owner approval before updating official quantity</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Counted Quantity</label>
              <Input
                type="number"
                value={updateCountForm.quantity}
                onChange={(e) => setUpdateCountForm({ ...updateCountForm, quantity: e.target.value })}
                placeholder="Enter counted quantity"
                error={updateCountError}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <Input
                value={updateCountForm.notes}
                onChange={(e) => setUpdateCountForm({ ...updateCountForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => { setIsUpdateCountOpen(false); setSelectedItem(null); }} disabled={updateCountMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCount} loading={updateCountMutation.isPending}>
                Submit for Approval
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Still Low Modal */}
      <ConfirmDialog
        open={isStillLowOpen}
        onClose={() => { setIsStillLowOpen(false); setSelectedItem(null); }}
        onConfirm={handleStillLow}
        title="Report Still Low Stock"
        description={
          selectedItem
            ? `Confirm that "${selectedItem.productName}" is still below reorder level (current: ${selectedItem.availableQuantity}, reorder: ${selectedItem.reorderLevel})?`
            : ''
        }
        confirmText="Report Still Low"
        loading={stillLowMutation.isPending}
      />

      {/* Pending Approvals Modal */}
      <Modal open={isPendingApprovalsOpen} onClose={() => { setIsPendingApprovalsOpen(false); }} title="Pending Inventory Updates" size="lg">
        <div className="space-y-4">
          {!pendingRequests || pendingRequests.data.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No pending inventory update requests</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingRequests?.data?.map((request: InventoryUpdateRequest) => (
                <div key={request.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{request.productName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Current: {request.previousQuantity} → Counted: {request.requestedQuantity}
                        {request.approvedQuantity != null && ` → Approved: ${request.approvedQuantity}`}
                      </p>
                      {request.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Note: {request.notes}</p>}
                    </div>
                    {getRequestStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleReject(request)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Notify Owner Modal */}
      <ConfirmDialog
        open={isNotifyOpen}
        onClose={() => { setIsNotifyOpen(false); setSelectedItem(null); }}
        onConfirm={handleNotify}
        title="Notify Owner of Low Stock"
        description={
          selectedItem
            ? `Send a low-stock notice to the owner for "${selectedItem.productName}"? Current available quantity: ${selectedItem.availableQuantity}`
            : ''
        }
        confirmText="Send Notice"
        loading={notifyMutation.isPending}
      />
    </PageLayout>
  )
}
