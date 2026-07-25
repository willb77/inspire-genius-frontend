import { VerticalShell } from "@/verticals/core"

/**
 * Entitlement gate + shell for the Job-Fit vertical.
 *
 * The gate, AppShell wrapping and role plumbing live in Core's `VerticalShell`;
 * Job-Fit declares which vertical it is and nothing more. Users lacking the
 * "job-fit" entitlement are redirected to /home.
 */
export default function JobFitLayout() {
  return <VerticalShell vertical="job-fit" />
}
