import { Button } from '@/components/ui/button'
import {Plus} from 'lucide-react'

type Props = {
  title: string
  addLabel: string
  onAdd: () => void
}

export default function ManagementHeader({ title, addLabel, onAdd }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-left">{title}</h1>
      <div className="flex flex-wrap gap-6">
        {/* <Button variant="outline" className="bg-gray-20">
          Sort By
          <ArrowDownAZ className="size-4" />
        </Button>
        <Button variant="outline" className="bg-gray-20">
          Filter
          <SlidersVertical className="size-4" />
        </Button> */}
        <Button onClick={onAdd}>
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </div>
    </div>
  )
}
