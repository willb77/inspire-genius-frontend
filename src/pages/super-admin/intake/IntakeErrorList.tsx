import { formatRegistryError } from "@/services/super-admin/practitioner-registry/registryErrors"
import type { RegistryError } from "@/types/practitioner-registry"

/**
 * Every problem the server listed, at once — "nothing was saved".
 *
 * intake-service refuses with the same `{"detail": [{field, message}]}` list
 * the Practitioner Registry uses, so its parser and formatter are reused
 * rather than copied.
 */
export function IntakeErrorList({ errors, label }: { errors: RegistryError[]; label: string }) {
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
