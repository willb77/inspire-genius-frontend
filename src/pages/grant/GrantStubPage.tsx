import type { LucideIcon } from "lucide-react"

type GrantStubPageProps = {
  title: string
  description: string
  icon: LucideIcon
}

/**
 * Placeholder page for GRANT tools whose UI ships in UI-1..7.
 * Renders inside the shared AppShell (light theme) via GrantLayout's Outlet.
 */
export default function GrantStubPage({ title, description, icon: Icon }: GrantStubPageProps) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-[rgba(59,91,255,0.1)] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#3B5BFF]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1f2937]">{title}</h1>
      </div>
      <p className="text-[#6b7280] mb-6">{description}</p>
      <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white p-10 text-center text-[#9ca3af]">
        Coming soon — this tool is scaffolded and wired to the GRANT data layer.
      </div>
    </div>
  )
}
