import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useSubmitIntake } from "@/hooks/job-blueprint/useTriage"
import { describeIntakeError } from "./intakeError"
import type { Candidate, JobDNA } from "@/types/job-blueprint"

/**
 * "Add candidate" — the one form the triage pipeline never had.
 *
 * `POST /v1/blueprint/triage/intake` (service, hook, tests) existed since the
 * pipeline shipped; nothing rendered it, so the only way to put a candidate
 * into a role's pipeline was a hand-made API call. The live-interview picker
 * reads the same pipeline, so an empty one also meant no session could be
 * linked to a Job DNA candidate.
 *
 * Identity (name, email) goes to the blind map on the server; the pipeline
 * shows the allocated code. Only published (`active`) roles are offered: a
 * draft has no benchmark for the candidate to be screened against.
 */
const schema = z.object({
  jobId: z.string().min(1, "Pick a published role"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  code: z.string().trim().max(32, "Codes are at most 32 characters"),
})
type FormValues = z.infer<typeof schema>

export function AddCandidateDialog({
  jobDnas,
  defaultJobId = "",
  onAdded,
}: {
  jobDnas: JobDNA[]
  /** Pre-select this role when it is published. */
  defaultJobId?: string
  onAdded?: (candidate: Candidate, jobId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intake = useSubmitIntake()
  const published = jobDnas.filter((jd) => jd.status === "active")

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { jobId: "", name: "", email: "", code: "" },
  })
  const { register, handleSubmit, reset, formState } = form

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    setError(null)
    if (next) {
      const preset = published.some((jd) => jd.id === defaultJobId) ? defaultJobId : ""
      reset({ jobId: preset, name: "", email: "", code: "" })
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      const candidate = await intake.mutateAsync({
        jobId: values.jobId,
        name: values.name,
        email: values.email,
        code: values.code || undefined,
      })
      if (!candidate) {
        setError("The server accepted the request but returned no candidate. Refresh the pipeline to check.")
        return
      }
      const code = candidate.code
      toast.success(`${values.name} added to the pipeline${code ? ` as ${code}` : ""}`)
      setOpen(false)
      reset()
      onAdded?.(candidate, values.jobId)
    } catch (err) {
      setError(describeIntakeError(err))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Add candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add a candidate</DialogTitle>
            <DialogDescription>
              Puts the person into the role&apos;s pipeline under a blind code. Their PRISM
              profile is scored against the role&apos;s reviewed benchmark once it is on file.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="intake-job">Role (published Job DNA)</Label>
              <select
                id="intake-job"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                {...register("jobId")}
              >
                <option value="">Select a published role…</option>
                {published.map((jd) => (
                  <option key={jd.id} value={jd.id}>
                    {jd.roleTitle}
                    {jd.department ? ` — ${jd.department}` : ""}
                  </option>
                ))}
              </select>
              {published.length === 0 ? (
                <p className="text-xs text-[#6b7280]">
                  No published roles yet. Publish a Job DNA benchmark first.
                </p>
              ) : null}
              {formState.errors.jobId ? (
                <p className="text-xs text-destructive">{formState.errors.jobId.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intake-name">Full name</Label>
              <Input id="intake-name" autoComplete="off" {...register("name")} />
              {formState.errors.name ? (
                <p className="text-xs text-destructive">{formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intake-email">Email</Label>
              <Input id="intake-email" type="email" autoComplete="off" {...register("email")} />
              {formState.errors.email ? (
                <p className="text-xs text-destructive">{formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intake-code">Candidate code (optional)</Label>
              <Input id="intake-code" placeholder="Allocated automatically if blank" {...register("code")} />
              {formState.errors.code ? (
                <p className="text-xs text-destructive">{formState.errors.code.message}</p>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="mt-5">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={intake.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={intake.isPending || published.length === 0}>
              {intake.isPending ? "Adding…" : "Add to pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
