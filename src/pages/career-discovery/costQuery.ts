import type { CostQuery } from "@/types/career-discovery"

/** DISC-3: `?cip=1107&level=3&school=199193`, as Education paths links it, or null. */
export function costQueryFrom(params: URLSearchParams): CostQuery | null {
  const cip = params.get("cip") ?? ""
  const level = Number(params.get("level"))
  const school = Number(params.get("school"))
  if (!/^\d{4}$/.test(cip) || !Number.isInteger(level) || level < 1 || level > 8) return null
  if (!Number.isInteger(school) || school < 1) return null
  return { cip, level, school }
}
