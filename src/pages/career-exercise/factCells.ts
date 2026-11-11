import type { OccupationDetail } from "@/types/job-fit/occupations"
import type {
  FactCell,
  PayWithVintage,
  ReadState,
  RoleCard,
  RoleFactCells,
  RoleFactReads,
} from "@/types/career-exercise/student"

/**
 * CX-5 — what a worksheet shows for a role's pay and education.
 *
 * The figures are the ones STORED in the session (written by the exercise from
 * OD-4 when the role was added). This page never fills a gap from anywhere
 * else, and it never shows a figure without its area AND its data year:
 *
 * - no stored median → the reason, never a number;
 * - a stored median with no area → the reason;
 * - a stored median whose data year cannot be confirmed (the OD-4 read failed,
 *   or now publishes a different figure for that area) → the reason;
 * - only a stored median whose area and published figure match OD-4's read
 *   today carries that read's vintage, and only then is the number shown.
 */

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

export const PAY_PENDING = "Checking the data year…"
export const NO_PAY = "No published pay for this role"
export const NO_AREA = "The area for this figure was not stated, so it is not shown"
export const NO_VINTAGE = "The data year for this figure could not be confirmed, so it is not shown"
export const NO_EDUCATION = "No education data for this role"

function unreadyReason(read: ReadState<unknown>): string | null {
  if (read.status !== "success" || !read.data) return null
  if (read.data.state === "ready") return null
  return read.data.reason?.trim() || null
}

export function payCell(role: RoleCard, read: ReadState<PayWithVintage>): FactCell {
  if (role.wage_median == null) {
    const why = unreadyReason(read)
    return { kind: "reason", text: why ? `Not available — ${why}` : `Not available — ${NO_PAY.toLowerCase()}` }
  }
  const area = (role.wage_area ?? "").trim()
  if (!area) return { kind: "reason", text: NO_AREA }
  if (read.status === "pending") return { kind: "pending", text: PAY_PENDING }
  const d = read.status === "success" && read.data?.state === "ready" ? read.data.data : null
  const vintage = (d?.vintageLabel || d?.asOf || "").trim()
  const sameFigure = d != null && d.areaLabel === area && d.median === role.wage_median
  if (!sameFigure || !vintage) return { kind: "reason", text: NO_VINTAGE }
  const range =
    role.wage_p25 != null && role.wage_p75 != null
      ? `, middle range ${money(role.wage_p25)}–${money(role.wage_p75)}`
      : ""
  return { kind: "value", text: `Median ${money(role.wage_median)} a year${range}`, area, vintage }
}

export const EDUCATION_AREA = "United States"

export function educationCell(role: RoleCard, read: ReadState<OccupationDetail>): FactCell {
  const label = (role.typical_education ?? "").trim()
  if (!label) {
    const why = unreadyReason(read)
    return { kind: "reason", text: why ? `Not available — ${why}` : `Not available — ${NO_EDUCATION.toLowerCase()}` }
  }
  if (read.status === "pending") return { kind: "pending", text: PAY_PENDING }
  const release = read.status === "success" && read.data?.state === "ready" ? (read.data.release ?? "").trim() : ""
  return {
    kind: "value",
    text: label,
    area: EDUCATION_AREA,
    vintage: release ? `O*NET ${release}` : "O*NET, release not confirmed",
  }
}

/** One line for the PDF and screen readers. */
export function cellLine(cell: FactCell): string {
  return cell.kind === "value" ? `${cell.text} (${cell.area}; ${cell.vintage})` : cell.text
}

const PENDING_READ = { status: "pending", data: undefined } as const

export function roleCells(role: RoleCard, reads: RoleFactReads | undefined): RoleFactCells {
  return {
    pay: payCell(role, reads?.pay ?? PENDING_READ),
    education: educationCell(role, reads?.education ?? PENDING_READ),
  }
}
