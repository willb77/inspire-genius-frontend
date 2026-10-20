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
import { DiscoveryError, DiscoveryLoading, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

/**
 * Who I am — Lumen's Self-Portrait, the same engine and the same sections,
 * served through Discovery's own route so it needs no Lumen entitlement.
 */
export default function WhoPage() {
  const { journey } = useDiscoveryContext()
  const { data: portrait, isLoading, isError, error } = useDiscoveryPortrait(journey.mayProceed)
  const advance = useAdvanceDiscovery()
  const { mutate } = advance
  const done = journey.stageStatus.who === "complete"
  const hasPrism = Boolean(portrait?.prism)
  useEffect(() => {
    if (hasPrism && !done) mutate({ stageId: "who" })
  }, [hasPrism, done, mutate])

  if (isLoading) return <DiscoveryLoading label="Loading your portrait" />
  if (isError || !portrait) return <DiscoveryError message={discoveryErrorMessage(error)} />
  return (
    <div className="space-y-6">
      <StageHeader
        title="Who I am"
        lead="How you tend to work, from what's on file. A mirror to think with, not a verdict on you."
      />
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
    </div>
  )
}
