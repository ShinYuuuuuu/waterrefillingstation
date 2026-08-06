import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { FiChevronRight } from 'react-icons/fi'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && (
              <FiChevronRight className="w-4 h-4 text-gray-400" />
            )}
            {item.href ? (
              <Link
                to={item.href}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'text-gray-900 dark:text-white font-medium',
                  index === items.length - 1
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
