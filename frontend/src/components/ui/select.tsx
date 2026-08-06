import { cn } from '@/utils/cn'
import { type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export function Select({
  className,
  error,
  options,
  placeholder,
  ...props
}: SelectProps) {
  return (
    <div>
      <select
        className={cn(
          'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors appearance-none cursor-pointer',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
