import { cn } from '@/utils/cn'
import type { ImgHTMLAttributes } from 'react'

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }

  const initials =
    fallback ??
    alt
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-400 font-medium overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          {...props}
        />
      ) : (
        <span className="sr-only">{alt}</span>
      )}
      {!src && (
        <span className="sr-only">{initials}</span>
      )}
    </div>
  )
}
