import { ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeContext } from '@/contexts/theme-context'
import { cn } from '@/utils/cn'
import { useAuthContext } from '@/contexts/auth-context'
import { FiSun, FiMoon, FiSearch, FiUser, FiSettings, FiLogOut, FiChevronDown, FiUsers } from 'react-icons/fi'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopbarProps {
  children?: ReactNode
}

export function Topbar({ children }: TopbarProps) {
  const { theme, toggleTheme } = useThemeContext()
  const { user, logout } = useAuthContext()
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      window.location.href = '/login'
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="h-16 flex items-center justify-between pl-14 pr-2 sm:pr-4 lg:px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        {children}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search..."
              className={cn(
                'w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <FiSun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <FiMoon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 sm:gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors max-w-[11rem] sm:max-w-none">
              <Avatar
                fallback={user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
                size="sm"
              />
              <span className="hidden sm:block max-w-32 lg:max-w-48 truncate text-sm font-medium text-gray-900 dark:text-white">
                {user?.full_name ?? 'User'}
              </span>
              <FiChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.full_name ?? 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.role ?? 'Unknown'}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <FiUser className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            {(user?.role === 'owner' || user?.role === 'super_admin') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <FiSettings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/manage-accounts')}>
                  <FiUsers className="w-4 h-4 mr-2" />
                  Manage Accounts
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-red-600 dark:text-red-400 cursor-pointer"
            >
              <FiLogOut className="w-4 h-4 mr-2" />
              {loggingOut ? 'Signing out...' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
