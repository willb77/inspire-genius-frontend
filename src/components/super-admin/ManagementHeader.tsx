import { Button } from '@/components/ui/button'
import {Plus} from 'lucide-react'

type Props = {
  title: string
  addLabel: string
  onAdd: () => void
  extraActions?: React.ReactNode
}

export default function ManagementHeader({ title, addLabel, onAdd, extraActions }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-left">{title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        {extraActions}
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </div>
    </div>
  )
}
