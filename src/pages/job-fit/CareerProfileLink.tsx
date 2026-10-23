import { Link } from "react-router-dom"
import { FileText } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useCareerPathwaysStatus } from "@/hooks/career-pathways/useCareerPathways"

/**
 * N-8 — the one way into the Career Pathways Profile from Career Pathways.
 * Renders nothing unless the server says the profile is on for this person, so
 * with the switch off (and on any error or 404) the Pathway page is unchanged.
 */
export function CareerProfileLink() {
  const { enabled } = useCareerPathwaysStatus()
  if (!enabled) return null
  return (
    <Link
      to={ROUTES.JOB_FIT.PROFILE}
      className="mb-6 flex items-center gap-2 rounded-lg border border-[#0D9488]/40 bg-[rgba(13,148,136,0.05)] p-3 text-sm text-[#0f766e] hover:border-[#0D9488]"
    >
      <FileText className="h-4 w-4" aria-hidden />
      Build your Career Pathways Profile — a document you own and can choose to share.
    </Link>
  )
}
