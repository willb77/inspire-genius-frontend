import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  trigger: React.ReactNode
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'default' | 'destructive' | 'secondary' | 'outline' | 'ghost' | 'link'
  onConfirm: () => void | Promise<void>
}

export default function ConfirmDialog({
  trigger,
  title = 'Are you sure?',
  description = 'Please confirm to proceed.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'destructive',
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    try {
      setSubmitting(true)
      await onConfirm()
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm} disabled={submitting}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
