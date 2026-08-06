import { ReactNode } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'

interface PageLayoutProps {
  title: string
  breadcrumbItems: Array<{ label: string; href?: string }>
  children: ReactNode
}

export function PageLayout({ title, breadcrumbItems, children }: PageLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
