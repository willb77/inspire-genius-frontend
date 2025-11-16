import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type Agent = { id: string; name: string }

export default function ExploreCoachesNames({ agents, isLoading, onSelect }: { agents: Agent[]; isLoading: boolean; onSelect?: (agent: Agent) => void }) {

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
          disabled={a.name !== "PRISM Coach"}
          className="justify-center bg-brown-10 hover:bg-brown-10/80 hover:text-black-250 text-black-250 rouned-xl border-none"
          onClick={() => onSelect?.(a)}
        >
          {a.name}
        </Button>
      ))}
    </div>
  )
}
