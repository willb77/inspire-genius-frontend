/**
 * "Find a person" — the lookup at the top of the Add-member dialog (T1).
 *
 * A super-admin searches the platform directory; everyone else searches their
 * own organisation's chart. Picking somebody hands their account id to the
 * dialog, which sends it as `memberSub`. Whether the caller may actually add
 * that person is the server's decision — this list is not a permission.
 */
import { useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROLES } from "@/constants/routes"
import { useAuth } from "@/context/useAuth"
import { usePersonLookup, type PersonOption } from "@/hooks/manager/development"
import { LOOKUP_MIN_CHARS } from "@/hooks/manager/development/usePersonLookup"

export function PersonLookup({
  selected,
  onSelect,
}: {
  selected: PersonOption | null
  onSelect: (person: PersonOption | null) => void
}) {
  const { hasRole } = useAuth()
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN)
  const [query, setQuery] = useState("")
  const { results, isLoading, isError } = usePersonLookup(query, isSuperAdmin)
  const searching = query.trim().length >= LOOKUP_MIN_CHARS

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
        <span>
          Adding <strong>{selected.name}</strong>
          {selected.email ? ` (${selected.email})` : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSelect(null)}
          aria-label="Clear the selected person"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="member-lookup">Find a person</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="member-lookup"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            isSuperAdmin ? "Search everyone by name or email" : "Search your organisation by name"
          }
          className="pl-8"
          autoComplete="off"
        />
      </div>
      {searching && (
        <div className="max-h-48 overflow-y-auto rounded-md border" aria-live="polite">
          {isError ? (
            <p role="alert" className="px-3 py-2 text-sm text-destructive">
              Couldn&apos;t search people right now. You can still type their details below.
            </p>
          ) : isLoading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No one found. You can still type their details below.
            </p>
          ) : (
            <ul>
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onSelect(p)
                      setQuery("")
                    }}
                  >
                    <span className="font-medium">{p.name}</span>
                    {(p.title || p.email) && (
                      <span className="ml-2 text-muted-foreground">{p.title || p.email}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Or type their details below. Only a person&apos;s manager, a company admin of their
        organisation or a super admin can add someone who already has an account.
      </p>
    </div>
  )
}

export default PersonLookup
