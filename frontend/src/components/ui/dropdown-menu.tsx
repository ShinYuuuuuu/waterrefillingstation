import { ReactNode, createContext, useContext, useState, useRef, useEffect } from 'react'
import { cn } from '@/utils/cn'

interface DropdownMenuContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = createContext<DropdownMenuContextType | null>(null)

function useDropdownMenu() {
  const context = useContext(DropdownMenuContext)
  if (!context) {
    throw new Error('DropdownMenu components must be used within a DropdownMenu')
  }
  return context
}

interface DropdownMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function DropdownMenu({
  open: controlledOpen,
  onOpenChange,
  children,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value)
    }
    onOpenChange?.(value)
  }

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: ReactNode
}

export function DropdownMenuTrigger({
  asChild = false,
  children,
}: DropdownMenuTriggerProps) {
  const { setOpen } = useDropdownMenu()

  if (asChild) {
    return <div onClick={() => setOpen(true)}>{children}</div>
  }

  return <button onClick={() => setOpen(true)}>{children}</button>
}

interface DropdownMenuContentProps {
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom'
  children: ReactNode
  className?: string
}

export function DropdownMenuContent({
  align = 'end',
  children,
  className,
}: DropdownMenuContentProps) {
  const { open, setOpen } = useDropdownMenu()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  if (!open) return null

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1',
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  asChild?: boolean
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
  disabled,
  asChild = false,
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenu()

  const handleClick = () => {
    if (disabled) return
    onClick?.()
    setOpen(false)
  }

  if (asChild) {
    return (
      <div
        className={cn(
          'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700',
          disabled && 'pointer-events-none opacity-50',
          className
        )}
        onClick={handleClick}
      >
        {children}
      </div>
    )
  }

  return (
    <button
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

interface DropdownMenuLabelProps {
  children: ReactNode
  className?: string
}

export function DropdownMenuLabel({
  children,
  className,
}: DropdownMenuLabelProps) {
  return (
    <div
      className={cn(
        'px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-white',
        className
      )}
    >
      {children}
    </div>
  )
}

interface DropdownMenuSeparatorProps {
  className?: string
}

export function DropdownMenuSeparator({
  className,
}: DropdownMenuSeparatorProps) {
  return (
    <div className={cn('-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700', className)} />
  )
}
