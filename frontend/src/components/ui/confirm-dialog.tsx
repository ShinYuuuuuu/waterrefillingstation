import { useState } from 'react'
import { Modal } from './modal'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isConfirming || loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={isConfirming || loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
