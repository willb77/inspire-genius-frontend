import { useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import {
  PortraitAnchorNote,
  PortraitCorroborating,
  PortraitDimensions,
  PortraitNoPrism,
} from "@/components/lumen/portrait"
import { ProvenanceNote } from "@/components/shared/ProvenanceNote"
import {
  discoveryErrorMessage,
  useAdvanceDiscovery,
  useDiscoveryPortrait,
} from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, StageHeader } from "../DiscoveryParts"
import { useDiscoveryContext } from "../discoveryContext"

const WHO_TITLE = "Who I am"
const WHO_LEAD = "How you tend to work, from what's on file. A mirror to think with, not a verdict on you."

/**
 * Who I am — Lumen's Self-Portrait, the same engine and the same sections,
 * served through Discovery's own route so it needs no Lumen entitlement.
 *
 * Standalone it is the Who I am page, unchanged. `embedded` (JF-11) renders the
 * same content as a section of the one profile page: a second-level heading,
 * and a loading or failure state that stays inside the section. Either way the
 * "who" stage records itself exactly as before once PRISM is on file.
 */
export function WhoSection({ embedded = false }: { embedded?: boolean }) {
  const { journey } = useDiscoveryContext()
  const { data: portrait, isLoading, isError, error } = useDiscoveryPortrait(journey.mayProceed)
  const advance = useAdvanceDiscovery()
  const { mutate } = advance
  const done = journey.stageStatus.who === "complete"
  const hasPrism = Boolean(portrait?.prism)
  useEffect(() => {
    if (hasPrism && !done) mutate({ stageId: "who" })
  }, [hasPrism, done, mutate])

  const header = embedded ? (
    <header className="space-y-1">
      <h2 className="text-lg font-semibold">{WHO_TITLE}</h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{WHO_LEAD}</p>
    </header>
  ) : (
    <StageHeader title={WHO_TITLE} lead={WHO_LEAD} />
  )

  if (isLoading) {
    return embedded ? (
      <section aria-label={WHO_TITLE} className="space-y-4">
        {header}
        <DiscoveryLoading label="Loading your portrait" />
      </section>
    ) : (
      <DiscoveryLoading label="Loading your portrait" />
    )
  }
  if (isError || !portrait) {
    return embedded ? (
      <section aria-label={WHO_TITLE} className="space-y-4">
        {header}
        <DiscoveryError message={discoveryErrorMessage(error)} />
      </section>
    ) : (
      <DiscoveryError message={discoveryErrorMessage(error)} />
    )
  }
  const body = (
    <>
      {header}
      <ProvenanceNote sources={portrait.sources ?? {}} className="max-w-3xl" />
      {!portrait.prism ? (
        <PortraitNoPrism title="What this is built on so far" headline={portrait.headline}>
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.PRISM_ASSESSMENT}>Take or check PRISM</Link>
          </Button>
        </PortraitNoPrism>
      ) : (
        <PortraitDimensions prism={portrait.prism} title="What sits underneath that" />
      )}
      <PortraitCorroborating instruments={portrait.corroborating} title="The other instruments we read" />
      <PortraitAnchorNote />
    </>
  )
  return embedded ? (
    <section aria-label={WHO_TITLE} className="space-y-6">
      {body}
    </section>
  ) : (
    <div className="space-y-6">{body}</div>
  )
}
