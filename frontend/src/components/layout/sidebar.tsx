import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useAuthContext } from '@/contexts/auth-context'
import {
  FiLayout,
  FiUsers,
  FiPackage,
  FiShoppingCart,
  FiTruck,
  FiBarChart2,
  FiSettings,
  FiUser,
  FiMenu,
  FiX,
  FiChevronLeft,
} from 'react-icons/fi'
import type { UserRole } from '@/types'

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
    roles: ['OWNER', 'BRANCH_MANAGER', 'CASHIER', 'INVENTORY_STAFF', 'RIDER', 'DISPATCHER', 'ACCOUNTANT', 'RESELLER', 'CUSTOMER', 'TECHNICIAN', 'SUPER_ADMIN'],
  },
  {
    href: '/customers',
    label: 'Customers',
    icon: FiUsers,
    roles: ['OWNER', 'BRANCH_MANAGER', 'CASHIER', 'SUPER_ADMIN'],
  },
  {
    href: '/products',
    label: 'Products',
    icon: FiPackage,
    roles: ['OWNER', 'BRANCH_MANAGER', 'INVENTORY_STAFF', 'SUPER_ADMIN'],
  },
  {
    href: '/inventory',
    label: 'Inventory',
    icon: FiPackage,
    roles: ['OWNER', 'BRANCH_MANAGER', 'INVENTORY_STAFF', 'SUPER_ADMIN'],
  },
  {
    href: '/gallons',
    label: 'Gallons',
    icon: FiShoppingCart,
    roles: ['OWNER', 'BRANCH_MANAGER', 'CASHIER', 'INVENTORY_STAFF', 'SUPER_ADMIN'],
  },
  {
    href: '/sales',
    label: 'Sales',
    icon: FiShoppingCart,
    roles: ['OWNER', 'BRANCH_MANAGER', 'CASHIER', 'SUPER_ADMIN'],
  },
  {
    href: '/deliveries',
    label: 'Deliveries',
    icon: FiTruck,
    roles: ['OWNER', 'BRANCH_MANAGER', 'RIDER', 'DISPATCHER', 'SUPER_ADMIN'],
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: FiBarChart2,
    roles: ['OWNER', 'BRANCH_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'],
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: FiSettings,
    roles: ['OWNER', 'SUPER_ADMIN'],
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: FiUser,
    roles: ['OWNER', 'BRANCH_MANAGER', 'CASHIER', 'INVENTORY_STAFF', 'RIDER', 'DISPATCHER', 'ACCOUNTANT', 'RESELLER', 'CUSTOMER', 'TECHNICIAN', 'SUPER_ADMIN'],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuthContext()

  const userRole = user?.role
  const filteredItems = menuItems.filter((item) =>
    userRole ? item.roles.includes(userRole) : false
  )

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">
              WSMS
            </span>
          </Link>
        )}
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
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
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
          'hidden lg:flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 lg:hidden">
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
