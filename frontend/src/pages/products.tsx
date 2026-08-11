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
import { productService } from '@/services/product.service'
import type { Product, ProductType, CreateProductRequest, UpdateProductRequest } from '@/types/product'
import { useToast } from '@/components/ui/toast'

const PRODUCT_TYPES = [
  { value: 'FINISHED_GOOD', label: 'Stocked Product' },
  { value: 'SERVICE', label: 'Service' },
] as const

const UNIT_OF_MEASURE_OPTIONS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'service', label: 'Service' },
]

export function ProductsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null)
  const [reactivateTargetId, setReactivateTargetId] = useState<string | null>(null)

  const [formData, setFormData] = useState<{
    categoryId: string
    sku: string
    name: string
    description?: string | null
    type: ProductType
    unitOfMeasure: string
    basePrice: number | string
    costPrice: number | string
    isContainer: boolean
    depositAmount?: number | string | null
    reorderLevel: number | string
    isActive: boolean
    isStockTracked: boolean
    isForSale: boolean
  }>({
    categoryId: '',
    sku: '',
    name: '',
    type: 'FINISHED_GOOD',
    unitOfMeasure: '',
    basePrice: '',
    costPrice: '',
    isContainer: false,
    reorderLevel: '',
    isActive: true,
    isStockTracked: true,
    isForSale: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products', searchQuery, page, statusFilter],
    queryFn: () =>
      productService.list({
        search: searchQuery || undefined,
        page,
        limit: 20,
        isActive: statusFilter === 'active' ? true : statusFilter === 'archived' ? false : undefined,
      }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductRequest) => productService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsFormOpen(false)
      resetForm()
      addToast({ type: 'success', title: 'Product created successfully' })
    },
    onError: (err: any) => {
      const details = err?.response?.data?.error?.details
      const message = details?.[0]?.message || err?.response?.data?.error?.message || 'Failed to create product'
      addToast({ type: 'error', title: message })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductRequest }) =>
      productService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsFormOpen(false)
      setEditingProduct(null)
      resetForm()
      addToast({ type: 'success', title: 'Product updated successfully' })
    },
    onError: (err: any) => {
      const details = err?.response?.data?.error?.details
      const message = details?.[0]?.message || err?.response?.data?.error?.message || 'Failed to update product'
      addToast({ type: 'error', title: message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDeleteTargetId(null)
      addToast({ type: 'success', title: 'Product deleted successfully' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to delete product' })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => productService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setArchiveTargetId(null)
      addToast({ type: 'success', title: 'Product archived successfully' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to archive product' })
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => productService.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setReactivateTargetId(null)
      addToast({ type: 'success', title: 'Product reactivated successfully' })
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to reactivate product' })
    },
  })

  const resetForm = () => {
    setFormData({
      categoryId: '',
      sku: '',
      name: '',
      type: 'FINISHED_GOOD',
      unitOfMeasure: '',
      basePrice: '',
      costPrice: '',
      isContainer: false,
      reorderLevel: '',
      isActive: true,
      isStockTracked: true,
      isForSale: true,
    })
    setFormErrors({})
  }

  const openCreateForm = () => {
    setEditingProduct(null)
    resetForm()
    setIsFormOpen(true)
  }

  const openEditForm = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      categoryId: product.categoryId,
      sku: product.sku,
      name: product.name,
      description: product.description,
      type: product.type,
      unitOfMeasure: product.unitOfMeasure,
      basePrice: product.basePrice,
      costPrice: product.costPrice,
      isContainer: product.isContainer,
      depositAmount: product.depositAmount,
      reorderLevel: product.reorderLevel,
      isActive: product.isActive,
      isStockTracked: product.isStockTracked,
      isForSale: product.isForSale,
    })
    setFormErrors({})
    setIsFormOpen(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.sku.trim()) errors.sku = 'Stock Keeping Unit is required'
    if (!formData.name.trim()) errors.name = 'Product name is required'
    if (!formData.unitOfMeasure.trim()) errors.unitOfMeasure = 'Unit of measure is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const toNumber = (value: string | number) => {
    const parsed = typeof value === 'string' ? parseFloat(value) : value
    return Number.isNaN(parsed) ? 0 : parsed
  }

  const buildPayload = (): CreateProductRequest | UpdateProductRequest => {
    const base = {
      categoryId: formData.categoryId || undefined,
      sku: formData.sku,
      name: formData.name,
      description: formData.description ?? null,
      type: formData.type,
      unitOfMeasure: formData.unitOfMeasure,
      basePrice: toNumber(formData.basePrice),
      costPrice: toNumber(formData.costPrice),
      isContainer: false,
      depositAmount: null,
      reorderLevel: toNumber(formData.reorderLevel),
      isActive: formData.isActive,
      isStockTracked: formData.isStockTracked,
      isForSale: formData.isForSale,
    }
    if (editingProduct) {
      return { ...base, categoryId: formData.categoryId || undefined }
    }
    return base
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, payload: buildPayload() as UpdateProductRequest })
    } else {
      createMutation.mutate(buildPayload() as CreateProductRequest)
    }
  }

  const handleDeleteClick = async (item: Product) => {
    try {
      const result = await productService.canDelete(item.id)
      if (result.canDelete) {
        setDeleteTargetId(item.id)
      } else {
        setArchiveTargetId(item.id)
      }
    } catch (err: any) {
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to check product' })
    }
  }

  const handleDelete = () => {
    if (deleteTargetId) {
      deleteMutation.mutate(deleteTargetId)
    }
  }

  const handleArchive = () => {
    if (archiveTargetId) {
      archiveMutation.mutate(archiveTargetId)
    }
  }

  const handleReactivate = () => {
    if (reactivateTargetId) {
      reactivateMutation.mutate(reactivateTargetId)
    }
  }

  const products = data?.data ?? []
  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isDeleting = deleteMutation.isPending || archiveMutation.isPending || reactivateMutation.isPending

  const columns = [
    { key: 'name', header: 'Product Name' },
    { key: 'sku', header: 'Stock Keeping Unit' },
    {
      key: 'type',
      header: 'Category',
      render: (item: Product) => (
        <Badge variant="info">{item.type}</Badge>
      ),
    },
    {
      key: 'basePrice',
      header: 'Price',
      render: (item: Product) => `₱${Number(item.basePrice).toFixed(2)}`,
    },
    {
      key: 'reorderLevel',
      header: 'Low-stock threshold',
      render: (item: Product) => String(item.reorderLevel),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item: Product) => (
        <Badge variant={item.isActive ? 'success' : 'danger'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Product) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditForm(item)}>
            <FiEdit className="w-4 h-4" />
          </Button>
          {item.isActive ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(item)}
                title="Delete product"
              >
                <FiTrash2 className="w-4 h-4 text-red-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setArchiveTargetId(item.id)}
                title="Archive product"
              >
                Archive
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReactivateTargetId(item.id)}
              title="Reactivate product"
            >
              Reactivate
            </Button>
          )}
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
        title="Products & Services"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products' },
        ]}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="mt-6">
          <SkeletonTable rows={5} columns={7} />
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout
        title="Products"
        breadcrumbItems={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products' },
        ]}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">
              {(error as any)?.message || 'Failed to load products'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Products & Services"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Products' },
      ]}
    >
      <div className="flex justify-end">
        <Button onClick={openCreateForm}>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'active' | 'archived' | 'all')}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No products match your search' : 'No products yet'}
            </p>
            <Button variant="outline" className="mt-4" onClick={openCreateForm}>
              Add your first product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={products}
          pagination={pagination}
          onPageChange={setPage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search products..."
          emptyMessage="No products found"
        />
      )}

      <Modal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingProduct(null)
          resetForm()
        }}
        title={editingProduct ? 'Edit Product or Service' : 'Add Product or Service'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stock Keeping Unit *
              </label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Enter Stock Keeping Unit"
                error={formErrors.sku}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                error={formErrors.name}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sale and inventory behavior</label>
            <Select
              options={[
                { value: 'STOCK', label: 'For sale — track a limited stock quantity' },
                { value: 'UNLIMITED', label: 'For sale — unlimited service (no inventory count)' },
                { value: 'INTERNAL', label: 'Not for sale — inventory/maintenance use only' },
              ]}
              value={!formData.isForSale ? 'INTERNAL' : formData.isStockTracked ? 'STOCK' : 'UNLIMITED'}
              onChange={(event) => {
                const behavior = event.target.value
                setFormData({
                  ...formData,
                  isForSale: behavior !== 'INTERNAL',
                  isStockTracked: behavior === 'STOCK' || behavior === 'INTERNAL',
                  reorderLevel: behavior === 'UNLIMITED' ? 0 : formData.reorderLevel,
                })
              }}
            />
            <p className="mt-1 text-xs text-gray-500">Use unlimited service for purified-water refills. It can always be sold and never becomes low stock.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <Select
                options={PRODUCT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ProductType })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit of Measure *
              </label>
              <Select
                options={UNIT_OF_MEASURE_OPTIONS}
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                error={formErrors.unitOfMeasure}
                placeholder="Select unit"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit Price
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                placeholder="Enter price"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost Price
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="Enter cost"
              />
            </div>
          </div>

          {formData.isStockTracked && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reorder Level
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                placeholder="Enter quantity"
              />
            </div>
          </div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 pt-6">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <Input
              value={formData.description ?? ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
              placeholder="Enter product description"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsFormOpen(false)
                setEditingProduct(null)
                resetForm()
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {editingProduct ? 'Update' : 'Create'} Product
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        description={
          deleteTargetId
            ? 'This product has no inventory or transaction history and can be permanently deleted.'
            : ''
        }
        confirmText="Delete Permanently"
        variant="danger"
        loading={isDeleting}
      />

      <ConfirmDialog
        open={!!archiveTargetId}
        onClose={() => setArchiveTargetId(null)}
        onConfirm={handleArchive}
        title="Archive Product"
        description={
          archiveTargetId
            ? 'This product has inventory or transaction history and cannot be permanently deleted without damaging records. Archive it instead?'
            : ''
        }
        confirmText="Archive Product"
        variant="default"
        loading={isDeleting}
      />

      <ConfirmDialog
        open={!!reactivateTargetId}
        onClose={() => setReactivateTargetId(null)}
        onConfirm={handleReactivate}
        title="Reactivate Product"
        description={
          reactivateTargetId
            ? 'This product will become available for new sales and active listings.'
            : ''
        }
        confirmText="Reactivate"
        variant="default"
        loading={isDeleting}
      />
    </PageLayout>
  )
}
