import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Download, Loader2, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ROLE_LABELS, SEGMENT_CONTEXT_LABELS, SEGMENT_STATUS_LABELS } from "@/constants/intake"
import { useExportRegistrations, useIntakeRegistration, useIntakeRegistrations } from "@/hooks/super-admin/useIntake"
import { registryErrorSummary } from "@/services/super-admin/practitioner-registry/registryErrors"
import { INTAKE_ROLES, SEGMENT_CONTEXTS, SEGMENT_STATUSES, type IntakeRole } from "@/types/intake"
import {
  DAY_OPTIONS,
  PAGE_SIZE,
  filtersFromView,
  formatDate,
  formatInZone,
  registrationsCsv,
  roleLabel,
  saveBlob,
  searchFromView,
  segmentLabel,
  viewFromSearch,
  type ListView,
} from "./intakeView"

const SELECT_CLASS = "border-input bg-background h-9 rounded-md border px-2 text-sm"
const COACHES = "career_coach,education_coach"

const ACCREDITED_LABELS = { yes: "Yes", no: "No", not_sure: "Not sure" } as const
const PURPOSE_LABELS = { webinar_email: "Webinar email", mailing_list: "Mailing list" } as const
const ATTENDANCE_LABELS = { registered: "Registered", attended: "Attended", no_show: "No-show" } as const

function RegistrationDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useIntakeRegistration(id)
  const r = detail.data
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{r ? `${r.first_name} ${r.last_name}` : "Registration"}</CardTitle>
          {r && (
            <CardDescription>
              Registered {formatDate(r.created_at)}
              {r.confirmed_at ? ` · confirmed ${formatDate(r.confirmed_at)}` : " · not confirmed"}
            </CardDescription>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close details">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {detail.isLoading ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : detail.error ? (
          <p role="alert" className="text-destructive">
            {registryErrorSummary(detail.error, "Could not load this registration")}
          </p>
        ) : r ? (
          <>
            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[max-content_1fr]">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{r.email}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{r.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">Organisation</dt>
              <dd>{r.organisation ?? "—"}</dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd>{roleLabel(r.role, r.role_other)}</dd>
              <dt className="text-muted-foreground">Segment</dt>
              <dd>
                {segmentLabel(r.segment_status, r.segment_context)}
                {r.needs_review && (
                  <Badge variant="outline" className="ml-2">
                    Needs review
                  </Badge>
                )}
              </dd>
              <dt className="text-muted-foreground">PRISM accredited</dt>
              <dd>
                {ACCREDITED_LABELS[r.prism_accredited]}
                {r.site_id ? ` · SiteID ${r.site_id}` : ""}
              </dd>
              <dt className="text-muted-foreground">Context</dt>
              <dd>
                {SEGMENT_CONTEXT_LABELS[r.context]}
                {r.context_other ? `: ${r.context_other}` : ""}
              </dd>
              <dt className="text-muted-foreground">Region / country</dt>
              <dd>
                {r.region} / {r.country}
              </dd>
              <dt className="text-muted-foreground">Heard from</dt>
              <dd>{r.heard_from ?? "—"}</dd>
            </dl>
            <div>
              <h3 className="mb-1 font-medium">Consents</h3>
              {r.consents.length === 0 ? (
                <p className="text-muted-foreground">None recorded.</p>
              ) : (
                <ul className="space-y-1">
                  {r.consents.map((c) => (
                    <li key={c.id}>
                      <span className="font-medium">{PURPOSE_LABELS[c.purpose]}</span>: {c.granted ? "yes" : "no"}{" "}
                      <span className="text-muted-foreground">
                        (form {c.form_version}) — “{c.wording}”
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-1 font-medium">Webinar</h3>
              {r.webinar_registrations.length === 0 ? (
                <p className="text-muted-foreground">No webinar choice recorded.</p>
              ) : (
                <ul className="space-y-1">
                  {r.webinar_registrations.map((w) => (
                    <li key={w.id}>
                      {w.webinar_id === null
                        ? "None of the offered times worked"
                        : `${w.webinar_title} · ${w.webinar_starts_at ? formatInZone(w.webinar_starts_at, "UTC") : ""}`}{" "}
                      <Badge variant="secondary">{ATTENDANCE_LABELS[w.status]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function RegistrationsTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = useMemo(() => viewFromSearch(searchParams), [searchParams])
  const filters = useMemo(() => filtersFromView(view), [view])
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState(view.q)

  // The URL is the filter. A menu click (HR, Coaches, …) changes it, and the
  // search box follows; typing updates the URL after a short pause.
  useEffect(() => setSearch(view.q), [view.q])
  const update = (patch: Partial<ListView>) =>
    setSearchParams(searchFromView({ ...view, page: 1, ...patch }, searchParams))
  useEffect(() => {
    if (search.trim() === view.q.trim()) return
    const t = setTimeout(() => setSearchParams(searchFromView({ ...view, q: search, page: 1 }, searchParams)), 300)
    return () => clearTimeout(t)
  }, [search, view, searchParams, setSearchParams])

  const offset = (view.page - 1) * PAGE_SIZE
  const list = useIntakeRegistrations(filters, PAGE_SIZE, offset)
  const exporter = useExportRegistrations()

  const roleValue = view.role.join(",")
  const roleKnown = roleValue === "" || roleValue === COACHES || (view.role.length === 1)

  const exportCsv = () =>
    exporter.mutate(filters, {
      onSuccess: (rows) => {
        saveBlob(new Blob([registrationsCsv(rows)], { type: "text/csv;charset=utf-8" }), "intake_registrations.csv")
        toast.success(`${rows.length} registration${rows.length === 1 ? "" : "s"} exported`)
      },
      onError: (err) => toast.error(registryErrorSummary(err, "Export failed")),
    })

  const total = list.data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="min-w-[14rem] flex-1 space-y-1">
            <Label htmlFor="intake-q">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="intake-q"
                className="pl-8"
                placeholder="Name, email or organisation"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="intake-status">Community</Label>
            <select
              id="intake-status"
              className={SELECT_CLASS}
              value={view.segment_status}
              onChange={(e) => update({ segment_status: e.target.value as ListView["segment_status"] })}
            >
              <option value="">All</option>
              {SEGMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SEGMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="intake-context">Context</Label>
            <select
              id="intake-context"
              className={SELECT_CLASS}
              value={view.segment_context}
              onChange={(e) => update({ segment_context: e.target.value as ListView["segment_context"] })}
            >
              <option value="">All</option>
              {SEGMENT_CONTEXTS.map((c) => (
                <option key={c} value={c}>
                  {SEGMENT_CONTEXT_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="intake-role">Role</Label>
            <select
              id="intake-role"
              className={SELECT_CLASS}
              value={roleValue}
              onChange={(e) =>
                update({ role: e.target.value ? (e.target.value.split(",") as IntakeRole[]) : [] })
              }
            >
              <option value="">All roles</option>
              <option value={COACHES}>Coaches (career + education)</option>
              {INTAKE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
              {!roleKnown && <option value={roleValue}>{view.role.map((r) => ROLE_LABELS[r]).join(" + ")}</option>}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="intake-review">Status</Label>
            <select
              id="intake-review"
              className={SELECT_CLASS}
              value={view.review}
              onChange={(e) => update({ review: e.target.value as ListView["review"] })}
            >
              <option value="">All</option>
              <option value="needs">Needs review</option>
              <option value="reviewed">No review needed</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="intake-days">Registered</Label>
            <select
              id="intake-days"
              className={SELECT_CLASS}
              value={view.days ?? ""}
              onChange={(e) => update({ days: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Any time</option>
              {DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  Last {d} days
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="outline" onClick={exportCsv} disabled={exporter.isPending || !!list.error}>
            {exporter.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(20rem,26rem)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrations</CardTitle>
            {list.data && (
              <CardDescription>
                {total} {total === 1 ? "person" : "people"} match these filters
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading registrations…
              </p>
            ) : list.error ? (
              <p role="alert" className="text-sm text-destructive">
                Could not load registrations — {registryErrorSummary(list.error, "the intake service did not answer")}
              </p>
            ) : (list.data?.items ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No registrations match these filters.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Person</TableHead>
                        <TableHead>Segment</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(list.data?.items ?? []).map((r) => (
                        <TableRow
                          key={r.id}
                          data-state={selected === r.id ? "selected" : undefined}
                          className="cursor-pointer"
                          onClick={() => setSelected(r.id)}
                        >
                          <TableCell>
                            <button type="button" className="text-left font-medium hover:underline">
                              {r.first_name} {r.last_name}
                            </button>
                            <div className="text-xs text-muted-foreground">
                              {[r.organisation, r.country].filter(Boolean).join(" · ")}
                            </div>
                          </TableCell>
                          <TableCell>{segmentLabel(r.segment_status, r.segment_context)}</TableCell>
                          <TableCell>{roleLabel(r.role, r.role_other)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(r.created_at)}</TableCell>
                          <TableCell>
                            {r.needs_review ? (
                              <Badge variant="outline">Needs review</Badge>
                            ) : r.confirmed_at ? (
                              <Badge>Confirmed</Badge>
                            ) : (
                              <Badge variant="secondary">Not confirmed</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {lastPage > 1 && (
                  <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={view.page <= 1}
                      onClick={() => update({ page: view.page - 1 })}
                    >
                      Previous
                    </Button>
                    <span>
                      Page {view.page} of {lastPage}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={view.page >= lastPage}
                      onClick={() => update({ page: view.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        {selected && <RegistrationDetail id={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}
