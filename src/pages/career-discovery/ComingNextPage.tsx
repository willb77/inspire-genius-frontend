import { NoticeCard, StageHeader } from "./DiscoveryParts"

const COPY: Record<"education" | "cost", { title: string; lead: string }> = {
  education: {
    title: "Education paths",
    lead: "The credentials each career area usually needs, and schools that offer them.",
  },
  cost: {
    title: "Cost and payback",
    lead: "What a path costs against what it pays.",
  },
}

/**
 * The two stages not built yet (DISC-2, DISC-3). Honest by construction: this
 * page renders no data at all, so it cannot show an invented number.
 */
export default function ComingNextPage({ stage }: { stage: "education" | "cost" }) {
  const c = COPY[stage]
  return (
    <div className="space-y-6">
      <StageHeader title={c.title} lead={c.lead} />
      <NoticeCard title="Coming next">
        <p>This step is being built. When it&apos;s ready it will appear here, using what you&apos;ve already done.</p>
      </NoticeCard>
    </div>
  )
}
