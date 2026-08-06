import { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { FiSearch } from 'react-icons/fi'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  leftIcon?: ReactNode
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  leftIcon,
}: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {leftIcon || <FiSearch className="w-4 h-4" />}
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          className
        )}
      />
    </div>
  )
}
