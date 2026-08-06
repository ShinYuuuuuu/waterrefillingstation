import { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon?: ReactNode
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  trend,
  trendValue,
  icon,
  className,
}: StatCardProps) {
  const trendIcon = {
    up: FiTrendingUp,
    down: FiTrendingDown,
    neutral: FiMinus,
  }

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  }

  const TrendIcon = trend ? trendIcon[trend] : undefined

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        {icon && (
          <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
            {icon}
          </div>
        )}
      </div>
      {(description || trend) && (
        <div className="mt-4 flex items-center gap-2">
          {trend && TrendIcon && (
            <TrendIcon className={cn('w-4 h-4', trendColors[trend])} />
          )}
          {trendValue && (
            <span className={cn('text-sm font-medium', trendColors[trend || 'neutral'])}>
              {trendValue}
            </span>
          )}
          {description && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
