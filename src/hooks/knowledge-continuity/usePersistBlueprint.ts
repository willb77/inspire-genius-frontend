import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { kceErrorMessage, kceErrorStatus } from "@/services/knowledge-continuity/authz"
import { createTaxonomyNode } from "@/services/knowledge-continuity/continuity.service"
import type {
  PersistBlueprintRequest,
  PersistBlueprintResult,
} from "@/types/knowledge-continuity"

/** The toast for a refused duplicate role title. */
export function roleExistsMessage(roleTitle: string): string {
  return `A role named "${roleTitle}" already exists. Rename it to save.`
}

/** True when the server refused the save because the role title is taken (409 `role_exists`). */
export function isRoleExistsError(error: unknown): boolean {
  if (kceErrorStatus(error) !== 409) return false
  const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
  return (
    typeof detail === "object" &&
    detail !== null &&
    (detail as { code?: unknown }).code === "role_exists"
  )
}

/**
 * Persist an approved blueprint tree as taxonomy nodes
 * (POST /v1/trainer/continuity/taxonomy, one node per call). Nodes are written
 * shallowest-first so each child's `parent_id` resolves to an already-created
 * node — the backend 404s a `parent_id` it can't find. The generator's local
 * `ref`s are mapped to the real DB ids as we go.
 *
 * D-10: the FIRST node is sent with `if_role_exists: "error"`, so saving a
 * role title that already has nodes is refused (409 `role_exists`) before
 * anything is written, instead of appending a second tree that `/roles` and
 * `/role-blueprint` then read as one. The remaining nodes send "append" —
 * they belong to the tree this call just started.
 */
export function usePersistBlueprint() {
  return useMutation<PersistBlueprintResult, AxiosError | Error, PersistBlueprintRequest>({
    mutationFn: async ({ org_id, role_title, nodes }) => {
      // Shallowest depth first so parents exist before their children.
      const ordered = [...nodes].sort((a, b) => a.depth - b.depth)
      const refToId = new Map<string, string>()
      let rootId: string | null = null

      for (const [index, node] of ordered.entries()) {
        const parentId = node.parent_ref ? refToId.get(node.parent_ref) : undefined
        // Persist the 8-section `section` + `rationale` in metadata so a saved
        // role reloads with the same shape it was drafted in.
        const metadata: Record<string, unknown> = {}
        if (node.section) metadata.section = node.section
        if (node.rationale) metadata.rationale = node.rationale
        const res = await createTaxonomyNode({
          org_id,
          role_title,
          name: node.name,
          node_type: node.node_type,
          ...(parentId ? { parent_id: parentId } : {}),
          ...(Object.keys(metadata).length > 0 ? { node_metadata: metadata } : {}),
          if_role_exists: index === 0 ? "error" : "append",
        })
        const created = res.data
        if (!created?.id) throw new Error("Taxonomy node create returned no id")
        refToId.set(node.ref, created.id)
        if (rootId === null && !node.parent_ref) rootId = created.id
      }

      return { created: ordered.length, rootId }
    },
    onError: (error, variables) => {
      if (isRoleExistsError(error)) {
        // Refused on the first node, so nothing was written.
        toast.error(roleExistsMessage(variables.role_title))
        return
      }
      toast.error(kceErrorMessage(error, "Couldn't save the blueprint. Some nodes may not have been created."))
    },
  })
}
