import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import DistributorLayout from "@/layouts/DistributorLayout"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDistributorPractitioners, useDistributorTerritory } from "@/hooks/distributor/useDistributor"
import { DASH, formatCredits, formatShare, readPractitioners, readTerritories } from "./distributorData"
import { Section } from "./parts"

type Tab = "practitioners" | "territory"

function isTab(v: string | null): v is Tab {
  return v === "practitioners" || v === "territory"
}

function PractitionersTab() {
  const { t } = useTranslation("distributorPages")
  const [search, setSearch] = useState("")
  const q = useDistributorPractitioners()
  const all = q.error ? null : readPractitioners(q.data)

  if (q.isLoading) return <PageState kind="loading" rows={5} />
  if (q.error) {
    return <PageState kind="error" message={t("loadPractitionersError", { defaultValue: "We couldn't load your practitioners." })} onRetry={() => void q.refetch()} />
  }
  if (!all) return <PageState kind="unavailable" message={t("practitionerListUnavailable", { defaultValue: "Your practitioner list isn't available yet." })} />
  if (all.length === 0) {
    return (
      <PageState
        kind="empty"
        title={t("noPractitionersTitle", { defaultValue: "No practitioners yet" })}
        message={t("noPractitionersBody", { defaultValue: "When practitioners join your network, they'll appear here." })}
      />
    )
  }

  const needle = search.trim().toLowerCase()
  const shown = needle
    ? all.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          (p.email ?? "").toLowerCase().includes(needle) ||
          (p.region ?? "").toLowerCase().includes(needle),
      )
    : all

  return (
    <Section title={t("practitionersTitle", { defaultValue: "Practitioners ({{total}})", total: all.length })}>
      <label className="mb-4 block max-w-md">
        <span className="sr-only">{t("searchPractitioners", { defaultValue: "Search by name, email or region" })}</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPractitioners", { defaultValue: "Search by name, email or region" })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {shown.length === 0 ? (
        <PageState kind="empty" title={t("noMatchesTitle", { defaultValue: "No matches" })} message={t("noMatchesBody", { defaultValue: "No practitioner matches that search." })} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t("practitionersTableCaption", { defaultValue: "Your practitioners and the credits each has been given and used" })}</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">{t("colName", { defaultValue: "Name" })}</th>
                <th className="py-2 font-medium">{t("colRegion", { defaultValue: "Region" })}</th>
                <th className="py-2 font-medium">{t("colCreditsGiven", { defaultValue: "Credits given" })}</th>
                <th className="py-2 font-medium">{t("colCreditsUsed", { defaultValue: "Credits used" })}</th>
                <th className="py-2 font-medium">{t("colShareUsed", { defaultValue: "Share used" })}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-b-0">
                  <td className="py-2">
                    <div className="font-medium text-foreground">{p.name}</div>
                    {p.email && <div className="text-xs text-muted-foreground">{p.email}</div>}
                  </td>
                  <td className="py-2 text-foreground">{p.region ?? DASH}</td>
                  <td className="py-2 text-foreground">{formatCredits(p.given)}</td>
                  <td className="py-2 text-foreground">{formatCredits(p.used)}</td>
                  <td className="py-2 text-foreground">{formatShare(p.used, p.given)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

function TerritoryTab() {
  const { t } = useTranslation("distributorPages")
  const q = useDistributorTerritory()
  const rows = q.error ? null : readTerritories(q.data)

  if (q.isLoading) return <PageState kind="loading" rows={4} />
  if (q.error) {
    return <PageState kind="error" message={t("loadTerritoryError", { defaultValue: "We couldn't load your territory." })} onRetry={() => void q.refetch()} />
  }
  if (!rows) return <PageState kind="unavailable" message={t("territoryUnavailable", { defaultValue: "Territory details aren't available yet." })} />
  if (rows.length === 0) {
    return (
      <PageState
        kind="empty"
        title={t("noRegionsTitle", { defaultValue: "No regions yet" })}
        message={t("noRegionsBody", { defaultValue: "Regions assigned to you will appear here." })}
      />
    )
  }
  return (
    <Section title={t("regionsTitle", { defaultValue: "Regions ({{total}})", total: rows.length })}>
      <table className="w-full text-sm">
        <caption className="sr-only">{t("regionsTableCaption", { defaultValue: "Your regions, with practitioners and coverage in each" })}</caption>
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 font-medium">{t("colRegion", { defaultValue: "Region" })}</th>
            <th className="py-2 font-medium">{t("practitioners", { defaultValue: "Practitioners" })}</th>
            <th className="py-2 font-medium">{t("colCoverage", { defaultValue: "Coverage" })}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-b-0">
              <td className="py-2 text-foreground">{r.name}</td>
              <td className="py-2 text-foreground">{r.practitioners ?? DASH}</td>
              <td className="py-2 text-foreground">{r.coverage == null ? DASH : `${Math.round(r.coverage)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  )
}

/**
 * My practitioners, house style (switch: `distributor`).
 *
 * The real roster and the real territory rows, or an honest empty / error
 * state. No sample practitioners, no fixed summary counts, and no
 * "Onboard Practitioner" button (it did nothing).
 */
export default function DistributorPractitionersHouse({ defaultTab = "practitioners" }: { defaultTab?: Tab }) {
  const { t } = useTranslation("distributorPages")
  const [searchParams, setSearchParams] = useSearchParams()
  const queryTab = searchParams.get("tab")
  const [tab, setTab] = useState<Tab>(isTab(queryTab) ? queryTab : defaultTab)

  const onChange = (value: string) => {
    if (!isTab(value)) return
    setTab(value)
    const params = new URLSearchParams(searchParams)
    params.set("tab", value)
    setSearchParams(params, { replace: true })
  }

  return (
    <DistributorLayout>
      <PageHeader
        title={t("myPractitionersTitle", { defaultValue: "My practitioners" })}
        description={t("myPractitionersDescription", { defaultValue: "The practitioners in your network and the regions you cover." })}
      />
      <Tabs value={tab} onValueChange={onChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="practitioners">{t("practitioners", { defaultValue: "Practitioners" })}</TabsTrigger>
          <TabsTrigger value="territory">{t("tabRegions", { defaultValue: "Regions" })}</TabsTrigger>
        </TabsList>
        <TabsContent value="practitioners">
          <PractitionersTab />
        </TabsContent>
        <TabsContent value="territory">
          <TerritoryTab />
        </TabsContent>
      </Tabs>
    </DistributorLayout>
  )
}
