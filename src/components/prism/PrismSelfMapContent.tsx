/**
 * The caller's OWN PRISM behavioral map, as the productionised radial wheel
 * (`PrismRadialMap`). Fetches lazily via `useMyPrism` and handles the
 * loading / error / no-data states, so both the HomeV2 "Behavioral map" pill
 * (BehavioralMapDialog) and the "Prism Data" dropdown's Brain Map item can
 * share one implementation instead of duplicating the fetch + states.
 *
 * Mount this only while its dialog is open — the React Query hook then never
 * runs while the surrounding tile sits closed on Home.
 */
import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import { PrismRadialMap } from "@/components/prism/PrismRadialMap"
import { useMyPrism } from "@/hooks/prism/useMyPrism"
import { withPrism } from "@/lib/withPrism"

export function PrismSelfMapContent(): JSX.Element {
  const { t } = useTranslation("prismUi")
  const { data, isLoading, isError } = useMyPrism(true)

  if (isLoading) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t("selfMap.loading", { defaultValue: "Loading your behavioral map…" })}
      </p>
    )
  }
  if (isError) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t("selfMap.error", { defaultValue: "Couldn't load your behavioral map. Please try again." })}
      </p>
    )
  }
  if (data?.hasData) {
    return <PrismRadialMap underlying={data.dimensions} />
  }
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      {withPrism(t("selfMap.noData", {
        defaultValue:
          "No PRISM assessment found yet. Complete a PRISM assessment to see your behavioral map here.",
      }))}
    </p>
  )
}

export default PrismSelfMapContent
