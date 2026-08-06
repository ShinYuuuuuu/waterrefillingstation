import { ReactNode } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from './table'
import { Pagination } from './pagination'
import { SearchBar } from './search-bar'
import type { PaginationState } from '@/types/pagination'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pagination?: PaginationState
  onPageChange?: (page: number) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchPlaceholder?: string
  emptyMessage?: string
  loading?: boolean
  rowKey?: keyof T | ((item: T) => string)
  onRowClick?: (item: T) => void
}

export function DataTable<T>({
  columns,
  data,
  pagination,
  onPageChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data found',
  loading = false,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const getKey = (item: T, index: number) => {
    if (rowKey) {
      if (typeof rowKey === 'function') {
        return rowKey(item)
      }
      return String(item[rowKey])
    }
    return String(index)
  }

  return (
    <div className="space-y-4">
      {(searchQuery !== undefined || onSearchChange) && (
        <SearchBar
          value={searchQuery ?? ''}
          onChange={onSearchChange ?? (() => {})}
          placeholder={searchPlaceholder}
        />
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={getKey(item, index)}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(item as T) : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && onPageChange && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
