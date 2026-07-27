import { getApi } from '@/lib/agentApi'
import type { BaseApiResponse } from '@/types/api'
import type { DraftBenchmarkRequest, DraftBenchmarkResponse } from '@/types/job-blueprint'

/**
 * Draft-a-blueprint service. The draft call is the one Job DNA operation that
 * runs against the Agent Engine (an LLM benchmarks all 22 dimensions), so it
 * routes through `getApi()` (agentApi / ECS) — NOT the `api` singleton the rest
 * of Job DNA persistence uses. Nothing is persisted here; the drafted benchmark
 * is reviewed and then saved via the existing job-dna create + finalize path.
 */
export const draftService = {
  draftBenchmark(body: DraftBenchmarkRequest) {
    return getApi().post<BaseApiResponse<DraftBenchmarkResponse>>(
      '/v1/agents/blueprint/draft-benchmark',
      body,
    )
  },
}
