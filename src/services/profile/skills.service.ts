import { agentApi } from "@/lib/agentApi"
import type { SaveSkillIn, SaveSkillOut, SkillSuggestions, UserSkill } from "@/types/profile/skills"

/**
 * JF-11 — Skills. Every call is the signed-in person's own: the server takes
 * the owner from the token, so nothing here ever sends a user id ("me" is a
 * fixed path segment, never an id).
 */
const PREFIX = "/v1/agents/me/skills"
type Envelope<T> = { status: boolean; data: T }

export async function getSkills(): Promise<UserSkill[]> {
  const { data } = await agentApi.get<Envelope<{ skills: UserSkill[] }>>(PREFIX)
  return data.data.skills
}

export async function saveSkill(body: SaveSkillIn): Promise<SaveSkillOut> {
  const { data } = await agentApi.post<Envelope<SaveSkillOut>>(PREFIX, body)
  return data.data
}

export async function removeSkill(id: string): Promise<{ id: string; removed: boolean }> {
  const { data } = await agentApi.delete<Envelope<{ id: string; removed: boolean }>>(
    `${PREFIX}/${encodeURIComponent(id)}`,
  )
  return data.data
}

/** Suggestions from my newest résumé. The server writes nothing for this call. */
export async function getSkillSuggestions(): Promise<SkillSuggestions> {
  const { data } = await agentApi.get<Envelope<SkillSuggestions>>(`${PREFIX}/suggestions`)
  return data.data
}
