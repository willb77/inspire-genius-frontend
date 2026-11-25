import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { AlertTriangle, Download, Loader2, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useDownloadOrgActivityDocx,
  useOrgActivityOrgs,
  useRunOrgActivityReport,
} from "@/hooks/super-admin/useOrgActivity"
import type { OrgActivityReport as Report } from "@/types/super-admin/orgActivity"
import { withPrism } from "@/lib/withPrism"
import type { ReactNode } from "react"

export const ORG_ACTIVITY_NS = "orgActivityUi"

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Lower-case and strip accents so "Societe" finds "Société". */
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

function Stat({ label, value }: { label: ReactNode; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-[#6b7280]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[#0B1F3A]">{value}</div>
    </div>
  )
}

export default function OrgActivityReport() {
  const { t } = useTranslation(ORG_ACTIVITY_NS)
  const orgs = useOrgActivityOrgs()
  const run = useRunOrgActivityReport()
  const docx = useDownloadOrgActivityDocx()
  const [orgId, setOrgId] = useState("")
  const [orgSearch, setOrgSearch] = useState("")
  const [includeInternal, setIncludeInternal] = useState(false)

  // Every word typed must appear in the name. The selected organization always
  // stays in the list, so typing a new search never silently drops the choice
  // the Run button is about to use.
  const allOrgs = orgs.data
  const matched = useMemo(() => {
    if (!allOrgs) return []
    const words = fold(orgSearch).split(/\s+/).filter(Boolean)
    if (words.length === 0) return allOrgs
    return allOrgs.filter((o) => {
      const name = fold(o.name)
      return words.every((w) => name.includes(w))
    })
  }, [allOrgs, orgSearch])
  const visibleOrgs = useMemo(() => {
    const kept = allOrgs?.find((o) => o.id === orgId)
    return kept && !matched.some((o) => o.id === orgId) ? [kept, ...matched] : matched
  }, [allOrgs, matched, orgId])
  const searching = orgSearch.trim() !== ""
  // The options the shown report was run with, so the Word button can never
  // download something different from what is on screen.
  const [ran, setRan] = useState<{ orgId: string; includeInternal: boolean } | null>(null)

  const report = run.data && ran ? run.data : null
  const stale = ran !== null && (ran.orgId !== orgId || ran.includeInternal !== includeInternal)

  const onRun = () => {
    if (!orgId) return
    const args = { orgId, includeInternal }
    setRan(args)
    run.mutate(args)
  }

  const onDownload = () => {
    if (!ran) return
    docx.mutate(ran, {
      onSuccess: ({ blob, filename }) => {
        // A zero-byte body is a failed build, not an empty report.
        if (blob.size === 0) {
          toast.error(t("downloadEmpty", { defaultValue: "The Word document came back empty. Try again." }))
          return
        }
        saveBlob(blob, filename)
      },
      onError: () =>
        toast.error(t("downloadFailed", { defaultValue: "The Word document could not be built. Nothing was changed." })),
    })
  }

  const emptyText = (r: Report): string | null => {
    if (r.empty === "no_members")
      return t("emptyNoMembers", {
        defaultValue:
          "This organization has no member profiles on this tier, so there is nothing to report. This is not a report of zero activity.",
      })
    if (r.empty === "no_customer_members")
      return t("emptyNoCustomers", {
        defaultValue:
          "This organization has only internal test/demo accounts. Turn on \"Include internal test/demo accounts\" and run again to see them.",
      })
    if (r.empty === "no_activity")
      return t("emptyNoActivity", {
        defaultValue:
          "These members have no recorded sign-ins or coach questions. This is a finding about the data, not a display fault.",
      })
    return null
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#0B1F3A]">
            {t("title", { defaultValue: "Organization activity" })}
          </CardTitle>
          <p className="text-[13px] text-[#6b7280]">
            {t("intro", {
              defaultValue:
                "Who is on the platform for one organization, what they have done and how often. The Word document contains member names and email addresses.",
            })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {orgs.isLoading && (
            <p className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loadingOrgs", { defaultValue: "Loading organizations…" })}
            </p>
          )}
          {orgs.isError && (
            <p role="alert" className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {t("orgsFailed", { defaultValue: "The organization list could not be loaded." })}
            </p>
          )}
          {orgs.data && (
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[280px] space-y-1.5">
                <Label htmlFor="org-activity-search">{t("orgSearchLabel", { defaultValue: "Search organizations" })}</Label>
                <Input
                  id="org-activity-search"
                  type="search"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder={t("orgSearchPlaceholder", { defaultValue: "Type part of a name…" })}
                  autoComplete="off"
                  className="h-9"
                />
                <p className="text-[12px] text-[#6b7280]" aria-live="polite">
                  {searching
                    ? matched.length === 0
                      ? t("orgNoMatch", { defaultValue: "No organization matches “{{q}}”.", q: orgSearch.trim() })
                      : t("orgMatchCount", {
                          defaultValue: "{{shown}} of {{total}} organizations match.",
                          shown: matched.length,
                          total: allOrgs?.length ?? 0,
                        })
                    : t("orgTotal", { defaultValue: "{{total}} organizations.", total: allOrgs?.length ?? 0 })}
                </p>
                <Label htmlFor="org-activity-org">{t("orgLabel", { defaultValue: "Organization" })}</Label>
                <select
                  id="org-activity-org"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                >
                  <option value="">{t("orgPlaceholder", { defaultValue: "Choose an organization…" })}</option>
                  {visibleOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {t("orgOption", {
                        defaultValue: "{{name}} ({{count}} members)",
                        name: o.name,
                        count: o.memberCount,
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pb-1.5">
                <Switch
                  id="org-activity-internal"
                  checked={includeInternal}
                  onCheckedChange={setIncludeInternal}
                />
                <Label htmlFor="org-activity-internal">
                  {t("includeInternal", { defaultValue: "Include internal test/demo accounts" })}
                </Label>
              </div>
              <Button onClick={onRun} disabled={!orgId || run.isPending}>
                {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {t("run", { defaultValue: "Run" })}
              </Button>
              <Button variant="outline" onClick={onDownload} disabled={!ran || !report || docx.isPending}>
                {docx.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t("download", { defaultValue: "Download Word (.docx)" })}
              </Button>
            </div>
          )}
          {orgs.data && orgs.data.length === 0 && (
            <p className="text-sm text-[#6b7280]">
              {t("noOrgs", { defaultValue: "No organizations exist on this tier." })}
            </p>
          )}
          {stale && report && (
            <p className="text-[13px] text-amber-700">
              {t("stale", {
                defaultValue: "The options changed since this report was run. Run again to refresh; Download uses the report shown.",
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {run.isError && (
        <p role="alert" className="flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {run.error?.response?.status === 404
            ? t("runNotFound", { defaultValue: "That organization was not found on this tier." })
            : t("runFailed", { defaultValue: "The report could not be built. Nothing was changed, and no numbers are shown." })}
        </p>
      )}

      {report && <ReportPreview report={report} emptyText={emptyText(report)} />}
    </div>
  )
}

function ReportPreview({ report: r, emptyText }: { report: Report; emptyText: string | null }) {
  const { t } = useTranslation(ORG_ACTIVITY_NS)
  const incl = r.include_internal
  const c = r.counts
  return (
    <div className="space-y-4" data-testid="org-activity-preview">
      <div>
        <h2 className="text-lg font-semibold text-[#0B1F3A]">{r.org.name}</h2>
        <p className="text-[13px] text-[#6b7280]">
          {t("asOf", {
            defaultValue: "Data as of {{asOf}} · generated {{generated}} · {{scope}}",
            asOf: r.as_of ?? t("unknown", { defaultValue: "unknown" }),
            generated: r.generated_on,
            scope: incl
              ? t("scopeAll", { defaultValue: "customer members and internal accounts" })
              : t("scopeCustomers", { defaultValue: "customer members only" }),
          })}
        </p>
        {incl && (
          <p className="mt-1 text-[13px] font-medium text-amber-700">
            {t("internalOn", { defaultValue: "Internal test/demo accounts are INCLUDED and marked below." })}
          </p>
        )}
      </div>

      {emptyText && (
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {emptyText}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label={incl ? t("statProfiles", { defaultValue: "Member profiles" }) : t("statCustomers", { defaultValue: "Customer members" })}
          value={c.included}
        />
        <Stat
          label={t("statActive", { defaultValue: "Ever active" })}
          value={`${c.included_ever_active} / ${c.included}`}
        />
        <Stat label={t("statCoachQs", { defaultValue: "Coach questions" })} value={r.chat_total} />
        <Stat
          label={withPrism(t("statPrism", { defaultValue: "PRISM requests (completed)" }))}
          value={`${r.prism_total} (${r.prism_completed})`}
        />
      </div>
      {!incl && c.internal > 0 && (
        <p className="text-[13px] text-[#6b7280]">
          {t("internalExcluded", {
            defaultValue: "{{count}} internal test/demo accounts are excluded from every number on this page.",
            count: c.internal,
          })}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("secMembers", { defaultValue: "What members have done" })}</CardTitle>
        </CardHeader>
        <CardContent>
          {r.members.length === 0 ? (
            <p className="text-sm text-[#6b7280]">{t("noMembers", { defaultValue: "No members to list." })}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colMember", { defaultValue: "Member" })}</TableHead>
                  <TableHead>{t("colEmail", { defaultValue: "Email" })}</TableHead>
                  <TableHead>{t("colRole", { defaultValue: "Role" })}</TableHead>
                  <TableHead>{t("colJoined", { defaultValue: "Joined" })}</TableHead>
                  <TableHead className="text-right">{t("colSignIns", { defaultValue: "Sign-ins" })}</TableHead>
                  <TableHead className="text-right">{t("colSignInDays", { defaultValue: "Sign-in days" })}</TableHead>
                  <TableHead>{t("colLast", { defaultValue: "Last sign-in" })}</TableHead>
                  <TableHead className="text-right">{t("colCoachQs", { defaultValue: "Coach Qs" })}</TableHead>
                  <TableHead className="text-right">{t("colGoals", { defaultValue: "Goals" })}</TableHead>
                  <TableHead className="text-right">{t("colActiveDays", { defaultValue: "Active days" })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.members.map((m) => (
                  <TableRow key={m.uid}>
                    <TableCell>
                      {m.name}
                      {m.internal && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          {t("internalTag", { defaultValue: "Internal" })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{m.role}</TableCell>
                    <TableCell>{m.joined ?? "—"}</TableCell>
                    <TableCell className="text-right">{m.login_events}</TableCell>
                    <TableCell className="text-right">{m.login_days}</TableCell>
                    <TableCell>{m.last_login ?? "—"}</TableCell>
                    <TableCell className="text-right">{m.chat_msgs}</TableCell>
                    <TableCell className="text-right">{m.goals}</TableCell>
                    <TableCell className="text-right">{m.active_days}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {r.members.length < r.members_total && (
            <p className="mt-2 text-[13px] text-[#6b7280]">
              {t("memberCap", {
                defaultValue: "Showing the first {{shown}} of {{total}} members. The Word document lists more.",
                shown: r.members.length,
                total: r.members_total,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("secCoach", { defaultValue: "Coach usage by specialist" })}</CardTitle>
          </CardHeader>
          <CardContent>
            {r.chat_by_agent.length === 0 ? (
              <p className="text-sm text-[#6b7280]">{t("noCoach", { defaultValue: "No coach questions recorded." })}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colAgent", { defaultValue: "Specialist" })}</TableHead>
                    <TableHead className="text-right">{t("colQuestions", { defaultValue: "Questions" })}</TableHead>
                    <TableHead className="text-right">{t("colAnswered", { defaultValue: "Answered" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.chat_by_agent.map((a) => (
                    <TableRow key={a.agent_name}>
                      <TableCell>{a.agent_name}</TableCell>
                      <TableCell className="text-right">{a.n}</TableCell>
                      <TableCell className="text-right">{a.answered}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{withPrism(t("secPrism", { defaultValue: "PRISM requests and goals" }))}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {r.prism.length === 0 ? (
              <p className="text-[#6b7280]">{withPrism(t("noPrism", { defaultValue: "No PRISM survey requests recorded." }))}</p>
            ) : (
              <ul className="space-y-1">
                {r.prism.map((p, i) => (
                  <li key={`${p.name}-${i}`}>
                    {p.name} — {p.questionnaire}, {p.requested ?? "—"} →{" "}
                    {p.completed ?? t("notCompleted", { defaultValue: "not completed" })}
                  </li>
                ))}
              </ul>
            )}
            {r.prism.length < r.prism_total && (
              <p className="text-[13px] text-[#6b7280]">
                {t("prismCap", {
                  defaultValue: "Showing the first {{shown}} of {{total}} requests.",
                  shown: r.prism.length,
                  total: r.prism_total,
                })}
              </p>
            )}
            <p>
              {r.goal_cats.length === 0
                ? t("noGoals", { defaultValue: "No goals captured." })
                : t("goalsLine", {
                    defaultValue: "Goals captured: {{total}} ({{cats}}).",
                    total: r.goals_total,
                    cats: r.goal_cats.map((g) => `${g.category.replace(/_/g, " ")} ${g.n}`).join(", "),
                  })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("secHow", { defaultValue: "How often" })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {r.weekly.length === 0 ? (
            <p className="text-sm text-[#6b7280]">
              {t("noFrequency", { defaultValue: "No sign-in or coach activity is recorded, so there is no frequency to report." })}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colWeek", { defaultValue: "Week of (Mon, UTC)" })}</TableHead>
                    <TableHead className="text-right">{t("colWeekActive", { defaultValue: "Active members" })}</TableHead>
                    <TableHead className="text-right">{t("colSignIns", { defaultValue: "Sign-ins" })}</TableHead>
                    <TableHead className="text-right">{t("colCoachQs", { defaultValue: "Coach Qs" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.weekly.map((w) => (
                    <TableRow key={w.wk}>
                      <TableCell>{w.wk}</TableCell>
                      <TableCell className="text-right">{w.users}</TableCell>
                      <TableCell className="text-right">{w.logins}</TableCell>
                      <TableCell className="text-right">{w.chats}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-sm">
                {t("dowLine", {
                  defaultValue: "Sign-ins by day of week ({{tz}}): {{days}}.",
                  tz: r.timezone,
                  days: DOW.map((d, i) => `${d} ${r.dow[i] ?? 0}`).join(", "),
                })}
              </p>
            </>
          )}
          {r.frequency.active_members > 0 && (
            <p className="text-sm">
              {t("freqLine", {
                defaultValue:
                  "Per active member: median {{median}} active day(s), maximum {{max}}; {{single}} of {{n}} were active on a single day only.",
                median: r.frequency.median_active_days ?? 0,
                max: r.frequency.max_active_days ?? 0,
                single: r.frequency.single_day_members,
                n: r.frequency.active_members,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("secCaveats", { defaultValue: "Observations and caveats" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {r.never_active.length > 0 && (
              <li>
                {t("neverActive", {
                  defaultValue: "{{count}} members show no sign-in or coach activity.",
                  count: r.never_active.length,
                })}
              </li>
            )}
            <li>
              {t("cavLogin", {
                defaultValue:
                  "Two login event types ('auth.user.login' and 'login') exist and may record the same sign-in, so sign-in days is the safer frequency measure than sign-ins.",
              })}
            </li>
            <li>{t("cavTime", { defaultValue: "Time-in-app and page views are not tracked, so they are not reported." })}</li>
            <li>
              {withPrism(t("cavFlags", {
                defaultValue: "Profile flags 'profile complete' and 'survey submitted' are unreliable; the PRISM request list is the better source.",
              }))}
            </li>
            <li>
              {t("cavLumen", {
                defaultValue: "Excluded: {{count}} automated 'Lumen moment delivered' system events, which are not member actions.",
                count: r.lumen_excluded,
              })}
            </li>
            {r.truncated.roster && (
              <li>{t("cavRoster", { defaultValue: "Only the first {{cap}} profiles are reported.", cap: r.caps.roster })}</li>
            )}
            {r.truncated.events && (
              <li>
                {t("cavEvents", {
                  defaultValue: "Activity is capped at the most recent {{cap}} events per source; earlier counts understate.",
                  cap: r.caps.events,
                })}
              </li>
            )}
            {r.truncated.prism && (
              <li>{withPrism(t("cavPrism", { defaultValue: "PRISM requests are capped at the most recent {{cap}}.", cap: r.caps.prism }))}</li>
            )}
            {r.truncated.goals && (
              <li>{t("cavGoals", { defaultValue: "Goals are capped at {{cap}} rows.", cap: r.caps.goals })}</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
