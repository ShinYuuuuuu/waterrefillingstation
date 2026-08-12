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
  compactOnMobile?: boolean
}

export function StatCard({
  title,
  value,
  description,
  trend,
  trendValue,
  icon,
  className,
  compactOnMobile = false,
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
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm',
        compactOnMobile ? 'p-3 sm:p-6' : 'p-6',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={cn('text-sm font-medium text-gray-600 dark:text-gray-400', compactOnMobile && 'text-xs leading-tight sm:text-sm')}>
            {title}
          </p>
          <p className={cn('mt-2 text-3xl font-bold text-gray-900 dark:text-white', compactOnMobile && 'mt-1 text-lg leading-tight break-all sm:mt-2 sm:text-3xl')}>
            {value}
          </p>
        </div>
        {icon && (
          <div className={cn('p-3 rounded-lg bg-gray-100 dark:bg-gray-700', compactOnMobile && 'hidden sm:block')}>
            {icon}
          </div>
        )}
      </div>
      {(description || trend) && (
        <div className={cn('mt-4 flex items-center gap-2', compactOnMobile && 'mt-1 sm:mt-4')}>
          {trend && TrendIcon && (
            <TrendIcon className={cn('w-4 h-4', trendColors[trend])} />
          )}
          {trendValue && (
            <span className={cn('text-sm font-medium', trendColors[trend || 'neutral'])}>
              {trendValue}
            </span>
          )}
          {description && (
            <span className={cn('text-sm text-gray-500 dark:text-gray-400', compactOnMobile && 'line-clamp-1 text-[10px] leading-tight sm:text-sm')}>
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
