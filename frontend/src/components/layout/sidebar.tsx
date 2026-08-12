import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useAuthContext } from '@/contexts/auth-context'
import {
  FiLayout,
  FiUsers,
  FiPackage,
  FiShoppingCart,
  FiTruck,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiTool,
} from 'react-icons/fi'
import type { UserRole } from '@/types'
import { APP_LOGO_URL, APP_SHORT_NAME } from '@/constants'
import { salesService } from '@/services/sales.service'
import { inventoryService } from '@/services/inventory.service'
import { maintenanceService } from '@/services/maintenance.service'

interface MenuItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const menuItems: MenuItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: FiLayout,
    roles: ['owner', 'cashier', 'super_admin'],
  },
  {
    href: '/customers',
    label: 'Customers',
    icon: FiUsers,
    roles: ['owner', 'cashier', 'super_admin'],
  },
  {
    href: '/products',
    label: 'Products',
    icon: FiPackage,
    roles: ['owner', 'cashier', 'super_admin'],
  },
  {
    href: '/inventory',
    label: 'Inventory',
    icon: FiPackage,
    roles: ['owner', 'cashier', 'super_admin'],
  },
  {
    href: '/sales',
    label: 'Sales',
    icon: FiShoppingCart,
    roles: ['owner', 'cashier', 'super_admin'],
  },
  {
    href: '/maintenance',
    label: 'Maintenance',
    icon: FiTool,
    roles: ['owner', 'super_admin'],
  },
  {
    href: '/deliveries',
    label: 'Deliveries',
    icon: FiTruck,
    roles: ['cashier', 'rider'],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuthContext()
  const [seenAt, setSeenAt] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('owner-page-seen-at') ?? '{}')
    } catch {
      return {}
    }
  })

  const latestSale = useQuery({
    queryKey: ['sidebar', 'latest-sale'],
    queryFn: () => salesService.list({ page: 1, limit: 1 }),
    enabled: user?.role === 'owner',
    refetchInterval: 30000,
  })
  const lowStock = useQuery({
    queryKey: ['sidebar', 'low-stock'],
    queryFn: () => inventoryService.getLowStockAlerts(),
    enabled: user?.role === 'owner',
    refetchInterval: 30000,
  })
  const pendingInventory = useQuery({
    queryKey: ['sidebar', 'pending-inventory'],
    queryFn: () => inventoryService.listInventoryUpdateRequests({ status: 'PENDING', page: 1, limit: 1 }),
    enabled: user?.role === 'owner',
    refetchInterval: 30000,
  })
  const maintenance = useQuery({
    queryKey: ['sidebar', 'maintenance'],
    queryFn: maintenanceService.list,
    enabled: user?.role === 'owner',
    refetchInterval: 60000,
  })

  const latestSaleAt = latestSale.data?.data[0]?.createdAt
  const hasUnseenSale = Boolean(latestSaleAt && new Date(latestSaleAt) > new Date(seenAt.sales ?? 0))
  const hasInventoryAttention = Boolean((lowStock.data?.length ?? 0) > 0 || (pendingInventory.data?.meta.total ?? 0) > 0)
  const hasMaintenanceAttention = Boolean(maintenance.data?.schedules.some((item) => {
    if (item.due) return true
    if (item.triggerType !== 'DAYS' || !item.nextDueAt) return false
    const millisecondsRemaining = new Date(item.nextDueAt).getTime() - Date.now()
    return millisecondsRemaining >= 0 && millisecondsRemaining <= 2 * 86400000
  }))

  const hasIndicator = (href: string) => {
    if (user?.role !== 'owner') return false
    if (href === '/sales') return hasUnseenSale
    if (href === '/inventory') return hasInventoryAttention
    if (href === '/maintenance') return hasMaintenanceAttention
    return false
  }

  const markPageSeen = (href: string) => {
    if (user?.role !== 'owner' || href !== '/sales') return
    const key = href.slice(1)
    const updated = { ...seenAt, [key]: new Date().toISOString() }
    setSeenAt(updated)
    localStorage.setItem('owner-page-seen-at', JSON.stringify(updated))
  }

  const userRole = user?.role
  const filteredItems = menuItems.filter((item) =>
    userRole ? item.roles.includes(userRole) : false
  )

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
          <img src={APP_LOGO_URL} alt="Z's Purified logo" className="w-10 h-10 shrink-0 rounded-full object-cover ring-1 ring-primary-100" />
          <span className={cn('font-semibold text-primary-900 dark:text-white leading-tight truncate', collapsed && 'lg:hidden')}>{APP_SHORT_NAME}</span>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle sidebar"
        >
          <FiChevronLeft
            className={cn(
              'w-5 h-5 text-gray-500 transition-transform',
              collapsed && 'rotate-180'
            )}
          />
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close sidebar"
        >
          <FiX className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => {
                setMobileOpen(false)
                markPageSeen(item.href)
              }}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                collapsed && 'lg:justify-center lg:px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className={cn('flex items-center gap-2', collapsed && 'lg:hidden')}>{item.label}{hasIndicator(item.href) && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="New activity" />}</span>
              {collapsed && hasIndicator(item.href) && <span className="hidden lg:block absolute ml-5 -mt-5 h-2 w-2 rounded-full bg-red-500" aria-label="New activity" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-primary-100 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 lg:hidden">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700"
        aria-label="Open sidebar"
      >
        <FiMenu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
    </>
  )
}
