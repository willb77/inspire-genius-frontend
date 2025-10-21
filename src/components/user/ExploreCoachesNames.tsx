import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type Agent = { id: string; name: string }

export default function ExploreCoachesNames({ agents, isLoading }: { agents: Agent[]; isLoading: boolean }) {

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {agents.map((a) => (
        <Button
          key={a.id}
          variant="outline"
          className="justify-center bg-brown-10 hover:bg-brown-10/80 hover:text-black-250 text-black-250 rouned-xl border-none"
        >
          {a.name}
        </Button>
      ))}
    </div>
  )
}
