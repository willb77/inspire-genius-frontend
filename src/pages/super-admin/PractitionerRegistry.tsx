import { useMemo, useState } from "react"
import { useForm, type UseFormRegisterReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { toast } from "sonner"
import { Download, Link2, Loader2, Pencil, Power, RefreshCw, Upload, UserPlus } from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  useAddPractitioner,
  useAssignablePractitioners,
  useAssignClient,
  useBulkAddPractitioners,
  useEditPractitioner,
  useRegistry,
  useRegeneratePractitionerCode,
  useRegistryRegions,
  useSetPractitionerActive,
} from "@/hooks/super-admin/usePractitionerRegistry"
import {
  formatRegistryError,
  registryErrors,
  registryErrorSummary,
} from "@/services/super-admin/practitioner-registry/registryErrors"
import type { RegistryError, RegistryRow } from "@/types/practitioner-registry"
import { addSchema, assignSchema, CSV_TEMPLATE, fieldsSchema } from "./practitionerRegistry.schemas"

/**
 * Super-admin → Practitioner Registry (Practitioner Programme PC-1a).
 *
 * One row per practitioner carrying the four PRISM identifiers their clients'
 * surveys will be raised under, plus region and country. Clients are assigned
 * to a practitioner HERE — the picker lives on this assignment surface, never
 * on a client's request form, because a roster dropdown there would enumerate
 * every practitioner to any signed-in user.
 *
 * Nothing on this page calls PRISM.
 */

type AddValues = z.input<typeof addSchema>
type FieldValues = z.input<typeof fieldsSchema>
type AssignValues = z.infer<typeof assignSchema>

const FIELD_LABELS: { name: keyof FieldValues; label: string; placeholder?: string }[] = [
  { name: "siteId", label: "PRISM Site ID" },
  { name: "clientId", label: "PRISM Client ID" },
  { name: "reference", label: "IG Reference" },
  { name: "externalIdent", label: "ExternalIdent" },
  { name: "region", label: "Region", placeholder: "e.g. North America" },
  { name: "country", label: "Country", placeholder: "e.g. US" },
]

const SELECT_CLASS = "border-input bg-background h-9 w-full rounded-md border px-2 text-sm"

function ErrorList({ errors, label }: { errors: RegistryError[]; label: string }) {
  if (errors.length === 0) return null
  return (
    <div role="alert" aria-label={label} className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm">
      <p className="mb-1 font-medium text-destructive">
        {errors.length === 1 ? "1 problem — nothing was saved" : `${errors.length} problems — nothing was saved`}
      </p>
      <ul className="list-disc space-y-0.5 pl-5">
        {errors.map((e, i) => (
          <li key={i}>{formatRegistryError(e)}</li>
        ))}
      </ul>
    </div>
  )
}

function FieldInputs({
  register,
  errors,
  idPrefix,
}: {
  register: (name: keyof FieldValues) => UseFormRegisterReturn
  errors: Partial<Record<keyof FieldValues, { message?: string }>>
  idPrefix: string
}) {
  return (
    <>
      {FIELD_LABELS.map((f) => (
        <div key={f.name} className="space-y-1">
          <Label htmlFor={`${idPrefix}-${f.name}`}>{f.label}</Label>
          <Input id={`${idPrefix}-${f.name}`} placeholder={f.placeholder} {...register(f.name)} />
          {errors[f.name]?.message && <p className="text-xs text-destructive">{errors[f.name]?.message}</p>}
        </div>
      ))}
    </>
  )
}

function AddOneCard() {
  const add = useAddPractitioner()
  const [serverErrors, setServerErrors] = useState<RegistryError[]>([])
  const form = useForm<AddValues>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      practitionerEmail: "",
      siteId: "",
      clientId: "",
      reference: "",
      externalIdent: "",
      region: "",
      country: "",
    },
  })
  const onSubmit = form.handleSubmit((values) => {
    setServerErrors([])
    add.mutate(addSchema.parse(values), {
      onSuccess: (row) => {
        toast.success(`${row.displayName} added to the registry`)
        form.reset()
      },
      onError: (err) => {
        const list = registryErrors(err)
        setServerErrors(list)
        if (list.length === 0) toast.error(registryErrorSummary(err, "Could not add the practitioner"))
      },
    })
  })
  const errs = form.formState.errors
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" /> Add one practitioner
        </CardTitle>
        <CardDescription>The account must already exist and hold the practitioner role.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="add-practitionerEmail">Practitioner email</Label>
            <Input id="add-practitionerEmail" type="email" {...form.register("practitionerEmail")} />
            {errs.practitionerEmail?.message && (
              <p className="text-xs text-destructive">{errs.practitionerEmail.message}</p>
            )}
          </div>
          <FieldInputs register={(name) => form.register(name)} errors={errs} idPrefix="add" />
          <div className="sm:col-span-2 space-y-2">
            <ErrorList errors={serverErrors} label="Add practitioner errors" />
            <Button type="submit" disabled={add.isPending}>
              {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add practitioner
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function BulkCard() {
  const bulk = useBulkAddPractitioners()
  const [csv, setCsv] = useState("")
  const [serverErrors, setServerErrors] = useState<RegistryError[]>([])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setCsv(await file.text())
    setServerErrors([])
  }
  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "practitioner_registry_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }
  const submit = () => {
    setServerErrors([])
    bulk.mutate(csv, {
      onSuccess: (r) => {
        toast.success(`${r.added} practitioner${r.added === 1 ? "" : "s"} added`)
        setCsv("")
      },
      onError: (err) => {
        const list = registryErrors(err)
        setServerErrors(list)
        if (list.length === 0) toast.error(registryErrorSummary(err, "Bulk add failed"))
      },
    })
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4" /> Bulk add from CSV
        </CardTitle>
        <CardDescription>
          All or nothing: if any row has a problem, every problem is listed and no row is saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" /> Template
          </Button>
          <Label htmlFor="bulk-file" className="sr-only">
            CSV file
          </Label>
          <Input
            id="bulk-file"
            type="file"
            accept=".csv,text/csv"
            className="max-w-xs"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
        <Label htmlFor="bulk-csv">CSV contents</Label>
        <Textarea
          id="bulk-csv"
          rows={6}
          value={csv}
          placeholder={CSV_TEMPLATE.trim()}
          onChange={(e) => setCsv(e.target.value)}
          className="font-mono text-xs"
        />
        <ErrorList errors={serverErrors} label="Bulk add errors" />
        <Button type="button" onClick={submit} disabled={!csv.trim() || bulk.isPending}>
          {bulk.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Upload
        </Button>
      </CardContent>
    </Card>
  )
}

function AssignCard() {
  const regions = useRegistryRegions()
  const assign = useAssignClient()
  const [serverErrors, setServerErrors] = useState<RegistryError[]>([])
  const form = useForm<AssignValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { region: "", country: "", practitionerSub: "", clientEmail: "" },
  })
  const region = form.watch("region")
  const country = form.watch("country")
  const countries = useMemo(
    () => regions.data?.find((r) => r.region === region)?.countries ?? [],
    [regions.data, region],
  )
  const practitioners = useAssignablePractitioners(region, country)
  const errs = form.formState.errors

  const onSubmit = form.handleSubmit((values) => {
    setServerErrors([])
    assign.mutate(
      { clientEmail: values.clientEmail, practitionerSub: values.practitionerSub },
      {
        onSuccess: () => {
          toast.success("Client assigned")
          form.setValue("clientEmail", "")
        },
        onError: (err) => {
          const list = registryErrors(err)
          setServerErrors(list)
          if (list.length === 0) toast.error(registryErrorSummary(err, "Could not assign the client"))
        },
      },
    )
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" /> Assign a client to a practitioner
        </CardTitle>
        <CardDescription>
          Choose the region, then the country, then the practitioner. The client must already hold an account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="assign-region">Region</Label>
            <select
              id="assign-region"
              className={SELECT_CLASS}
              {...form.register("region", {
                onChange: () => {
                  form.setValue("country", "")
                  form.setValue("practitionerSub", "")
                },
              })}
            >
              <option value="">Select…</option>
              {(regions.data ?? []).map((r) => (
                <option key={r.region} value={r.region}>
                  {r.region}
                </option>
              ))}
            </select>
            {errs.region?.message && <p className="text-xs text-destructive">{errs.region.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="assign-country">Country</Label>
            <select
              id="assign-country"
              className={SELECT_CLASS}
              disabled={!region}
              {...form.register("country", { onChange: () => form.setValue("practitionerSub", "") })}
            >
              <option value="">Select…</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errs.country?.message && <p className="text-xs text-destructive">{errs.country.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="assign-practitioner">Practitioner</Label>
            <select
              id="assign-practitioner"
              className={SELECT_CLASS}
              disabled={!country}
              {...form.register("practitionerSub")}
            >
              <option value="">Select…</option>
              {(practitioners.data ?? []).map((p) => (
                <option key={p.practitionerSub} value={p.practitionerSub}>
                  {p.displayName}
                  {p.email ? ` — ${p.email}` : ""}
                </option>
              ))}
            </select>
            {errs.practitionerSub?.message && (
              <p className="text-xs text-destructive">{errs.practitionerSub.message}</p>
            )}
          </div>
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="assign-clientEmail">Client email</Label>
            <Input id="assign-clientEmail" type="email" {...form.register("clientEmail")} />
            {errs.clientEmail?.message && <p className="text-xs text-destructive">{errs.clientEmail.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-3">
            <ErrorList errors={serverErrors} label="Assignment errors" />
            <Button type="submit" disabled={assign.isPending}>
              {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign client
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function EditDialog({ row, onClose }: { row: RegistryRow; onClose: () => void }) {
  const edit = useEditPractitioner()
  const [serverErrors, setServerErrors] = useState<RegistryError[]>([])
  const form = useForm<FieldValues>({
    resolver: zodResolver(fieldsSchema),
    defaultValues: {
      siteId: row.siteId,
      clientId: row.clientId,
      reference: row.reference,
      externalIdent: row.externalIdent,
      region: row.region,
      country: row.country,
    },
  })
  const onSubmit = form.handleSubmit((values) => {
    setServerErrors([])
    edit.mutate(
      { practitionerSub: row.practitionerSub, ...fieldsSchema.parse(values) },
      {
        onSuccess: () => {
          toast.success("Registry row updated")
          onClose()
        },
        onError: (err) => {
          const list = registryErrors(err)
          setServerErrors(list)
          if (list.length === 0) toast.error(registryErrorSummary(err, "Could not save"))
        },
      },
    )
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {row.displayName}</DialogTitle>
          <DialogDescription>Changes apply to PRISM requests raised after they are saved.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <FieldInputs register={(name) => form.register(name)} errors={form.formState.errors} idPrefix="edit" />
          <div className="sm:col-span-2">
            <ErrorList errors={serverErrors} label="Edit errors" />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={edit.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * PC-1c: confirm before replacing a practitioner's code. The old code stops
 * working the moment this succeeds, so a client holding it can no longer
 * connect — the practitioner has to hand out the new one.
 */
function RegenerateCodeDialog({ row, onClose }: { row: RegistryRow; onClose: () => void }) {
  const regenerate = useRegeneratePractitionerCode()
  const confirm = () =>
    regenerate.mutate(row.practitionerSub, {
      onSuccess: (updated) => {
        toast.success(`New code for ${row.displayName}: ${updated.practitionerCode ?? "—"}`)
        onClose()
      },
    })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate code for {row.displayName}?</DialogTitle>
          <DialogDescription>
            The current code {row.practitionerCode ? <span className="font-mono">{row.practitionerCode}</span> : null} stops
            working immediately. Clients who already connected stay connected; anyone who has not yet entered the old
            code will need the new one.
          </DialogDescription>
        </DialogHeader>
        {regenerate.error && (
          <p role="alert" className="text-sm text-destructive">
            {registryErrorSummary(regenerate.error, "Could not regenerate the code")}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={regenerate.isPending}>
            {regenerate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RegistryTable() {
  const [includeInactive, setIncludeInactive] = useState(false)
  const [editing, setEditing] = useState<RegistryRow | null>(null)
  const [regenerating, setRegenerating] = useState<RegistryRow | null>(null)
  const registry = useRegistry(includeInactive)
  const setActive = useSetPractitionerActive()

  const toggle = (row: RegistryRow) =>
    setActive.mutate(
      { practitionerSub: row.practitionerSub, active: !row.active },
      {
        onSuccess: () => toast.success(row.active ? "Practitioner deactivated" : "Practitioner reactivated"),
        onError: (err) => toast.error(registryErrorSummary(err, "Could not change the practitioner's status")),
      },
    )

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Registry</CardTitle>
          <CardDescription>A deactivated practitioner disappears from the assignment picker.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="include-inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
          <Label htmlFor="include-inactive" className="text-sm">
            Show deactivated
          </Label>
        </div>
      </CardHeader>
      <CardContent>
        {registry.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading registry…
          </p>
        ) : registry.error ? (
          <p role="alert" className="text-sm text-destructive">
            {registryErrorSummary(registry.error, "Could not load the registry")}
          </p>
        ) : (registry.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No practitioners in the registry yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Practitioner</TableHead>
                  <TableHead>Site ID</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>IG Reference</TableHead>
                  <TableHead>ExternalIdent</TableHead>
                  <TableHead>Region / country</TableHead>
                  <TableHead>Practitioner code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(registry.data ?? []).map((row) => (
                  <TableRow key={row.practitionerSub}>
                    <TableCell>
                      <div className="font-medium">{row.displayName}</div>
                      {row.email && <div className="text-xs text-muted-foreground">{row.email}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.siteId}</TableCell>
                    <TableCell className="font-mono text-xs">{row.clientId}</TableCell>
                    <TableCell className="font-mono text-xs">{row.reference}</TableCell>
                    <TableCell className="font-mono text-xs">{row.externalIdent}</TableCell>
                    <TableCell>
                      {row.region} / {row.country}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-mono text-xs">{row.practitionerCode ?? "—"}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRegenerating(row)}
                        aria-label={`Regenerate code for ${row.displayName}`}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Deactivated"}</Badge>
                    </TableCell>
                    <TableCell className="space-x-1 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(row)} aria-label={`Edit ${row.displayName}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggle(row)}
                        disabled={setActive.isPending}
                        aria-label={`${row.active ? "Deactivate" : "Reactivate"} ${row.displayName}`}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {editing && <EditDialog row={editing} onClose={() => setEditing(null)} />}
      {regenerating && <RegenerateCodeDialog row={regenerating} onClose={() => setRegenerating(null)} />}
    </Card>
  )
}

export default function PractitionerRegistry() {
  return (
    <SuperAdminLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold">Practitioner Registry</h1>
          <p className="text-sm text-muted-foreground">
            Each practitioner's PRISM Site ID, Client ID, IG Reference and ExternalIdent, and which clients they hold.
          </p>
        </div>
        <RegistryTable />
        <div className="grid gap-6 lg:grid-cols-2">
          <AddOneCard />
          <BulkCard />
        </div>
        <AssignCard />
      </div>
    </SuperAdminLayout>
  )
}
