import { Button } from '@/components/ui/button'

type Props = {
  onCancel: () => void
  onSubmit: () => void
  isSubmitting?: boolean
  submitLabel: string
}

export default function ModalFormFooter({ onCancel, onSubmit, isSubmitting, submitLabel }: Props) {
  return (
    <>
      <Button
        variant="secondary"
        className="bg-gray-100 hover:bg-gray-100 text-foreground"
        onClick={onCancel}
        type="button"
      >
        Cancel
      </Button>
      <Button onClick={onSubmit} disabled={!!isSubmitting} type="button">
        {submitLabel}
      </Button>
    </>
  )
}
