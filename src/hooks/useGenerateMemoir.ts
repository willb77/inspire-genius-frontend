import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { generateMemoir } from "@/services/bio/bioService"
import { buildClientMemoir } from "@/lib/bio/clientMemoir"
import type {
  MemberNarrative,
  MemoirRequest,
  MemoirResponse,
} from "@/types/bio"

export type GenerateMemoirVars = MemoirRequest & {
  memberId: string
  /**
   * The narrative already loaded on the page, used to assemble a memoir
   * client-side when the backend endpoint is absent (404) or fails. Passing it
   * is what makes the export degrade gracefully instead of erroring.
   */
  fallbackNarrative: MemberNarrative
}

/**
 * Generate a memoir, preferring the backend and degrading gracefully.
 *
 * The `POST /v1/agents/bio/{id}/memoir` endpoint MAY be absent in environments
 * where the backend has not been promoted yet (a frontend deploy reaches those
 * environments before the backend does). Rather than surface that as a failure,
 * this mutation catches ANY error from the call and assembles the memoir from
 * the narrative the caller already holds — same `MemoirResponse` shape, with
 * `generated: false` marking it client-built. The mutation therefore never
 * rejects on a missing endpoint; the returned `generated` flag lets the UI note
 * the difference if it wants to.
 */
export function useGenerateMemoir() {
  return useMutation<MemoirResponse, AxiosError, GenerateMemoirVars>({
    mutationFn: async ({ memberId, fallbackNarrative, style, moduleTypes }) => {
      try {
        return await generateMemoir(memberId, { style, moduleTypes })
      } catch {
        // 404 (endpoint not yet promoted), 5xx, or a network error — fall back
        // to a memoir built from the narrative we already have. This is the
        // whole point of the hook: a missing endpoint must not break export.
        return buildClientMemoir(fallbackNarrative, { style, moduleTypes })
      }
    },
  })
}
