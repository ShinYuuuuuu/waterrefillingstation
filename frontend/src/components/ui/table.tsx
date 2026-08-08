import { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm text-left text-gray-500 dark:text-gray-400', className)}>
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps {
  children: ReactNode
}

export function TableHeader({ children }: TableHeaderProps) {
  return (
    <thead className="text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
      {children}
    </thead>
  )
}

interface TableBodyProps {
  children: ReactNode
}

export function TableBody({ children }: TableBodyProps) {
  return (
    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
      {children}
    </tbody>
  )
}

interface TableRowProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr
      className={cn(
        'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: ReactNode
  className?: string
  colSpan?: number
}

export function TableCell({ children, className, colSpan }: TableCellProps) {
  return (
    <td
      className={cn('px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap', className)}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}

interface TableHeadProps {
  children: ReactNode
  className?: string
}

export function TableHead({ children, className }: TableHeadProps) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 sm:px-6 py-3 font-medium text-gray-700 dark:text-gray-300',
        className
      )}
    >
      {children}
    </th>
  )
}
