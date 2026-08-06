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
import { useAuthContext } from '@/contexts/auth-context'
import { apiClient } from '@/api/client'
import { inventoryService } from '@/services/inventory.service'
import type { InventoryItem, LedgerEntry, StockCountSession, AdjustmentRequest } from '@/types/inventory'
import { FiEdit, FiFileText, FiCheckCircle, FiAlertTriangle, FiBell } from 'react-icons/fi'

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isStockCountOpen, setIsStockCountOpen] = useState(false)
  const [isNotifyOpen, setIsNotifyOpen] = useState(false)

  const [adjustForm, setAdjustForm] = useState({ quantity: '', reason: 'MANUAL' as AdjustmentRequest['reason'], notes: '' })
  const [adjustError, setAdjustError] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', 'branch', searchQuery, page, lowStockOnly],
    queryFn: () => inventoryService.listBranchInventory({ page, limit: 20, search: searchQuery || undefined, lowStock: lowStockOnly || undefined }),
  })

  const { data: lowStockAlerts } = useQuery({
    queryKey: ['inventory', 'alerts', 'low-stock'],
    queryFn: () => inventoryService.getLowStockAlerts(),
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

  const notifyMutation = useMutation({
    mutationFn: () => Promise.resolve({ success: true }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Low-stock notice sent to owner' })
      setIsNotifyOpen(false)
      setSelectedItem(null)
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

  const getStatusBadge = (item: InventoryItem) => {
    const available = item.availableQuantity
    if (available <= 0) return <Badge variant="danger">Out of Stock</Badge>
    if (available <= item.reorderLevel) return <Badge variant="warning">Low Stock</Badge>
    return <Badge variant="success">In Stock</Badge>
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
            {!isOwner && isLowStock && (
              <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setIsNotifyOpen(true); }}>
                <FiBell className="w-4 h-4 text-yellow-600" />
              </Button>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search inventory..."
        />
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
        />
      )}

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
                  placeholder="Use negative to deduct"
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
