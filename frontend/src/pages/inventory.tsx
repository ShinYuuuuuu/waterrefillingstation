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
import type {
  InventoryItem,
  LedgerEntry,
  StockCountSession,
  InventoryUpdateRequest,
} from '@/types/inventory'
import { FiFileText, FiCheckCircle, FiAlertTriangle, FiTrash2 } from 'react-icons/fi'

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
  const [isDeleteInventoryOpen, setIsDeleteInventoryOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isStockCountOpen, setIsStockCountOpen] = useState(false)
  const [isNotifyOpen, setIsNotifyOpen] = useState(false)
  const [isUpdateCountOpen, setIsUpdateCountOpen] = useState(false)
  const [isStillLowOpen, setIsStillLowOpen] = useState(false)
  const [isPendingApprovalsOpen, setIsPendingApprovalsOpen] = useState(false)

  const [editInventoryForm, setEditInventoryForm] = useState({ itemName: '', sku: '', quantityOnHand: '', reorderLevel: '' })
  const [adjustError, setAdjustError] = useState('')
  const [updateCountForm, setUpdateCountForm] = useState({ quantity: '', notes: '' })
  const [updateCountError, setUpdateCountError] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', 'branch', searchQuery, page, lowStockOnly],
    queryFn: () => inventoryService.listBranchInventory({ page, limit: 20, search: searchQuery || undefined, lowStock: lowStockOnly || undefined }),
  })
  const { data: lowStockAlerts } = useQuery({
    queryKey: ['inventory', 'alerts', 'low-stock'],
    queryFn: () => inventoryService.getLowStockAlerts(),
    enabled: isOwner,
  })

  const { data: inventoryLoans = [] } = useQuery({ queryKey: ['inventory', 'loans'], queryFn: () => inventoryService.listInventoryLoans(), enabled: isOwner })
  const resolveLoanMutation = useMutation({
    mutationFn: ({ id, action, amount }: { id: string; action: 'RETURN' | 'SOLD'; amount?: number }) => action === 'RETURN' ? inventoryService.returnInventoryLoan(id) : inventoryService.sellInventoryLoan(id, amount!, 'CASH'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); addToast({ type: 'success', title: 'Circulation record updated' }) },
    onError: (err: any) => addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update circulation record' }),
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

  const editInventoryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) throw new Error('No inventory item selected')
      await productService.update(selectedItem.productId, {
        name: editInventoryForm.itemName.trim(),
        sku: editInventoryForm.sku.trim().toUpperCase(),
        reorderLevel: Number(editInventoryForm.reorderLevel),
      })
      return inventoryService.updateBranchInventory(selectedItem.id, {
        quantityOnHand: Number(editInventoryForm.quantityOnHand),
        reservedQuantity: 0,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      addToast({ type: 'success', title: 'Inventory item updated successfully' })
      setIsAdjustOpen(false)
      setSelectedItem(null)
      setAdjustError('')
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update inventory item' })
    },
  })

  const deleteInventoryMutation = useMutation({
    mutationFn: () => {
      if (!selectedItem) throw new Error('No inventory item selected')
      return inventoryService.deleteBranchInventory(selectedItem.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      addToast({ type: 'success', title: 'Item removed from inventory' })
      setIsDeleteInventoryOpen(false)
      setIsAdjustOpen(false)
      setSelectedItem(null)
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to remove inventory item' })
    },
  })

  const notifyMutation = useMutation({
    mutationFn: () => Promise.resolve({ success: true }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Low-stock notice sent to owner' })
      setIsNotifyOpen(false)
      setSelectedItem(null)
    },
  })

  const updateCountMutation = useMutation({
    mutationFn: ({ inventoryId, quantity }: { inventoryId: string; quantity: number }) =>
      inventoryService.updateBranchInventory(inventoryId, {
        quantityOnHand: quantity,
        reservedQuantity: 0,
        lastCountedAt: new Date().toISOString(),
      }),
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      const isLow = updatedItem.quantityOnHand <= updatedItem.reorderLevel
      addToast({
        type: isLow ? 'warning' : 'success',
        title: isLow
          ? 'Count updated; the owner has been notified of low stock'
          : 'Inventory count updated successfully',
      })
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

  const handleEditInventory = () => {
    if (!selectedItem) return
    const quantity = Number(editInventoryForm.quantityOnHand)
    const reorderLevel = Number(editInventoryForm.reorderLevel)
    if (!editInventoryForm.itemName.trim()) {
      setAdjustError('Enter an inventory item name')
      return
    }
    if (!editInventoryForm.sku.trim()) {
      setAdjustError('Enter a Stock Keeping Unit')
      return
    }
    if (!Number.isInteger(quantity) || quantity < 0 || !Number.isInteger(reorderLevel) || reorderLevel < 0) {
      setAdjustError('Quantity and order-reminder count must be valid whole numbers')
      return
    }
    setAdjustError('')
    editInventoryMutation.mutate()
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
      inventoryId: selectedItem.id,
      quantity: qty,
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

  const openInventoryItem = (item: InventoryItem) => {
    setSelectedItem(item)
    if (isOwner) {
      setEditInventoryForm({
        itemName: item.productName,
        sku: item.productSku,
        quantityOnHand: String(item.quantityOnHand),
        reorderLevel: String(item.reorderLevel),
      })
      setAdjustError('')
      setIsAdjustOpen(true)
      return
    }
    setUpdateCountForm({ quantity: String(item.quantityOnHand), notes: '' })
    setUpdateCountError('')
    setIsUpdateCountOpen(true)
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
    { key: 'originalCount', header: 'Original Count' },
    { key: 'quantityOnHand', header: 'At Shop', render: (item: InventoryItem) => (
      <div>
        <p className="font-medium">{item.quantityOnHand}</p>
      </div>
    )},
    { key: 'inCirculation', header: 'In Circulation' },
    { key: 'soldQuantity', header: 'Sold' },
    { key: 'currentBaseCount', header: 'Currently Owned' },
    { key: 'reorderLevel', header: 'Order Reminder At' },
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
  ], [])

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
          onRowClick={openInventoryItem}
        />
      )}

      {isOwner && (
        <Card className="mt-6">
          <CardContent className="py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lent Inventory</h2>
            <p className="text-sm text-gray-500 mb-4">See who holds shop property and resolve it when returned or paid.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="py-2 pr-4">Customer</th><th className="py-2 pr-4">Item</th><th className="py-2 pr-4">Quantity</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Date Lent</th><th className="py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {inventoryLoans.map((loan) => (
                    <tr key={loan.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 pr-4">{loan.customer.full_name}</td>
                      <td className="py-3 pr-4">{loan.product.name}</td>
                      <td className="py-3 pr-4">{loan.quantity}</td>
                      <td className="py-3 pr-4"><Badge variant={loan.status === 'OUTSTANDING' ? 'warning' : loan.status === 'SOLD' ? 'success' : 'default'}>{loan.status === 'OUTSTANDING' ? 'Unpaid / In Circulation' : loan.status === 'SOLD' ? 'Paid / Sold' : 'Returned'}</Badge></td>
                      <td className="py-3 pr-4">{new Date(loan.lent_at).toLocaleDateString()}</td>
                      <td className="py-3"><div className="flex gap-2">
                        {loan.status === 'OUTSTANDING' && <>
                          <Button size="sm" variant="secondary" onClick={() => resolveLoanMutation.mutate({ id: loan.id, action: 'RETURN' })}>Returned</Button>
                          <Button size="sm" onClick={() => {
                            const entered = window.prompt(`Enter the total amount paid for ${loan.quantity} ${loan.product.name}:`)
                            if (entered === null) return
                            const amount = Number(entered)
                            if (!Number.isFinite(amount) || amount <= 0) return addToast({ type: 'error', title: 'Enter a valid payment amount' })
                            resolveLoanMutation.mutate({ id: loan.id, action: 'SOLD', amount })
                          }}>Paid — Mark Sold</Button>
                        </>}
                      </div></td>
                    </tr>
                  ))}
                  {inventoryLoans.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-500">No lent inventory records</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Inventory Modal */}
      <Modal open={isAdjustOpen} onClose={() => { setIsAdjustOpen(false); setSelectedItem(null); }} title="Edit Inventory Item" size="md">
        {selectedItem && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item name</label>
              <Input
                value={editInventoryForm.itemName}
                onChange={(e) => setEditInventoryForm({ ...editInventoryForm, itemName: e.target.value })}
                error={adjustError}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Keeping Unit</label>
              <Input
                value={editInventoryForm.sku}
                onChange={(e) => setEditInventoryForm({ ...editInventoryForm, sku: e.target.value })}
                placeholder="e.g. CAPS-001"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The Stock Keeping Unit must be unique and will be saved in uppercase.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity on hand</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={editInventoryForm.quantityOnHand}
                  onChange={(e) => setEditInventoryForm({ ...editInventoryForm, quantityOnHand: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remind me to order when stock reaches</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={editInventoryForm.reorderLevel}
                  onChange={(e) => setEditInventoryForm({ ...editInventoryForm, reorderLevel: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="danger" onClick={() => setIsDeleteInventoryOpen(true)} disabled={editInventoryMutation.isPending}>
                  <FiTrash2 className="w-4 h-4 mr-2" /> Delete Item
                </Button>
                <Button variant="secondary" onClick={() => { setIsAdjustOpen(false); setIsHistoryOpen(true); refetchHistory(); }}>
                  <FiFileText className="w-4 h-4 mr-2" /> View History
                </Button>
              </div>
              <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setIsAdjustOpen(false); setSelectedItem(null); }} disabled={editInventoryMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleEditInventory} loading={editInventoryMutation.isPending}>
                Save Changes
              </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={isDeleteInventoryOpen}
        onClose={() => setIsDeleteInventoryOpen(false)}
        onConfirm={() => deleteInventoryMutation.mutate()}
        title="Delete Inventory Item"
        description={selectedItem ? `Remove "${selectedItem.productName}" from inventory? Historical sales will be kept.` : ''}
        confirmText="Delete Item"
        variant="danger"
        loading={deleteInventoryMutation.isPending}
      />

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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter the physical count currently at the shop.</p>
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
            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" onClick={() => { setIsUpdateCountOpen(false); setIsHistoryOpen(true); refetchHistory(); }}>
                  <FiFileText className="w-4 h-4 mr-2" /> View History
                </Button>
                {selectedItem.availableQuantity <= selectedItem.reorderLevel && (
                  <Button variant="secondary" onClick={() => { setIsUpdateCountOpen(false); setIsStillLowOpen(true) }}>
                    <FiAlertTriangle className="w-4 h-4 mr-2 text-yellow-600" /> Report Low Stock
                  </Button>
                )}
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button variant="secondary" onClick={() => { setIsUpdateCountOpen(false); setSelectedItem(null); }} disabled={updateCountMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCount} loading={updateCountMutation.isPending}>
                Save Count
              </Button>
              </div>
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
            ? `Confirm that "${selectedItem.productName}" is at or below its order reminder (current: ${selectedItem.availableQuantity}, reminder: ${selectedItem.reorderLevel})?`
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
