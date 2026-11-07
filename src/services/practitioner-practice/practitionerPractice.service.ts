import axios from "axios"
import { agentApi } from "@/lib/agentApi"
import type { MyPracticeRegistration, MyPracticeState } from "@/types/practitioner-practice"

export const MY_PRACTICE_PATH = "/v1/agents/practitioner-registry/me"

/**
 * The calling practitioner's own PRISM registry row (PI-2).
 *
 * Calls `agentApi` — the route lives on the agent-engine under
 * `/v1/agents/{proxy+}`. The server keys the read on the verified token, so
 * nothing identifying is sent. 404 (no row) and 403 (programme switched off)
 * are expected answers and come back as states; anything else throws, so the
 * page can say "could not load" instead of showing a false "not registered".
 */
export async function getMyPracticeRegistration(): Promise<MyPracticeState> {
  try {
    const { data } = await agentApi.get<{ status: boolean; data: MyPracticeRegistration }>(
      MY_PRACTICE_PATH,
    )
    return { state: "registered", registration: data.data }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status
      if (status === 404) return { state: "missing" }
      if (status === 403) return { state: "dark" }
    }
    throw err
  }
}
