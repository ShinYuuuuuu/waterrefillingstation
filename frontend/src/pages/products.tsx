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
import { productService } from '@/services/product.service'
import type { Product, ProductType, CreateProductRequest, UpdateProductRequest } from '@/types/product'
import { useToast } from '@/components/ui/toast'

const PRODUCT_TYPES = [
  { value: 'FINISHED_GOOD', label: 'Finished Good' },
  { value: 'RAW_MATERIAL', label: 'Raw Material' },
  { value: 'CONTAINER', label: 'Container' },
  { value: 'ACCESSORY', label: 'Accessory' },
  { value: 'SERVICE', label: 'Service' },
] as const

export function ProductsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

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
    reorderLevel: number
    isActive: boolean
  }>({
    categoryId: '',
    sku: '',
    name: '',
    type: 'FINISHED_GOOD',
    unitOfMeasure: '',
    basePrice: 0,
    costPrice: 0,
    isContainer: false,
    reorderLevel: 0,
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products', searchQuery, page],
    queryFn: () =>
      productService.list({
        search: searchQuery || undefined,
        page,
        limit: 20,
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
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to create product' })
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
      addToast({ type: 'error', title: err?.response?.data?.error?.message || 'Failed to update product' })
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
      setDeleteTargetId(null)
    },
  })

  const resetForm = () => {
    setFormData({
      categoryId: '',
      sku: '',
      name: '',
      type: 'FINISHED_GOOD',
      unitOfMeasure: '',
      basePrice: 0,
      costPrice: 0,
      isContainer: false,
      reorderLevel: 0,
      isActive: true,
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
    })
    setFormErrors({})
    setIsFormOpen(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.sku.trim()) errors.sku = 'SKU is required'
    if (!formData.name.trim()) errors.name = 'Product name is required'
    if (!formData.unitOfMeasure.trim()) errors.unitOfMeasure = 'Unit of measure is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, payload: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = () => {
    if (deleteTargetId) {
      deleteMutation.mutate(deleteTargetId)
    }
  }

  const products = data?.data ?? []
  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isDeleting = deleteMutation.isPending

  const columns = [
    { key: 'name', header: 'Product Name' },
    { key: 'sku', header: 'SKU' },
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
      header: 'Stock',
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
        title="Products"
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
      title="Products"
      breadcrumbItems={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Products' },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products..."
        />
        <Button onClick={openCreateForm}>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
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
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU *
              </label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Enter SKU"
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
              <Input
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                placeholder="e.g. pcs, L, kg"
                error={formErrors.unitOfMeasure}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Price
              </label>
              <Input
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value ? Number(e.target.value) : 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost Price
              </label>
              <Input
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value ? Number(e.target.value) : 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reorder Level
              </label>
              <Input
                type="number"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category ID
              </label>
              <Input
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                placeholder="Category UUID"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 pt-6">
              <input
                id="isContainer"
                type="checkbox"
                checked={formData.isContainer}
                onChange={(e) => setFormData({ ...formData, isContainer: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isContainer" className="text-sm text-gray-700 dark:text-gray-300">
                Is Container
              </label>
            </div>
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

          {formData.isContainer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deposit Amount
              </label>
              <Input
                type="number"
                value={formData.depositAmount ?? ''}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value ? Number(e.target.value) : null })}
                placeholder="0.00"
              />
            </div>
          )}

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
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </PageLayout>
  )
}
