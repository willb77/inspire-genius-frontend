import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { createTaxonomyNode } from "@/services/knowledge-continuity/continuity.service"
import type {
  PersistBlueprintRequest,
  PersistBlueprintResult,
} from "@/types/knowledge-continuity"

/**
 * Persist an approved blueprint tree as taxonomy nodes
 * (POST /v1/trainer/continuity/taxonomy, one node per call). Nodes are written
 * shallowest-first so each child's `parent_id` resolves to an already-created
 * node — the backend 404s a `parent_id` it can't find. The generator's local
 * `ref`s are mapped to the real DB ids as we go.
 */
export function usePersistBlueprint() {
  return useMutation<PersistBlueprintResult, AxiosError | Error, PersistBlueprintRequest>({
    mutationFn: async ({ org_id, role_title, nodes }) => {
      // Shallowest depth first so parents exist before their children.
      const ordered = [...nodes].sort((a, b) => a.depth - b.depth)
      const refToId = new Map<string, string>()
      let rootId: string | null = null

      for (const node of ordered) {
        const parentId = node.parent_ref ? refToId.get(node.parent_ref) : undefined
        const res = await createTaxonomyNode({
          org_id,
          role_title,
          name: node.name,
          node_type: node.node_type,
          ...(parentId ? { parent_id: parentId } : {}),
        })
        const created = res.data
        if (!created?.id) throw new Error("Taxonomy node create returned no id")
        refToId.set(node.ref, created.id)
        if (rootId === null && !node.parent_ref) rootId = created.id
      }

      return { created: ordered.length, rootId }
    },
    onError: () => {
      toast.error("Couldn't save the blueprint. Some nodes may not have been created.")
    },
  })
}
