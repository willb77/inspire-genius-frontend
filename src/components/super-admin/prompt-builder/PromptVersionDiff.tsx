type PromptVersionDiffProps = {
  oldText: string
  newText: string
  oldVersion: string
  newVersion: string
}

export default function PromptVersionDiff({ oldText, newText, oldVersion, newVersion }: PromptVersionDiffProps) {
  return (
    <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-[#e5e7eb]">
        <div className="bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#991B1B]">
          Version {oldVersion} (Previous)
        </div>
        <div className="bg-[#ECFDF5] px-3 py-2 text-xs font-semibold text-[#065F46]">
          Version {newVersion} (Current)
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#e5e7eb]">
        <div className="p-3 text-[13px] text-[#374151] whitespace-pre-wrap bg-[#FFFBFB] max-h-[300px] overflow-y-auto">
          {oldText || <span className="text-[#9ca3af] italic">Empty</span>}
        </div>
        <div className="p-3 text-[13px] text-[#374151] whitespace-pre-wrap bg-[#F7FDF9] max-h-[300px] overflow-y-auto">
          {renderWithHighlights(newText)}
        </div>
      </div>
    </div>
  )
}

function renderWithHighlights(text: string) {
  if (!text) return <span className="text-[#9ca3af] italic">Empty</span>
  const parts = text.split(/(\{\{[^}]+\}\})/)
  return parts.map((part, i) =>
    part.startsWith("{{") ? (
      <span key={i} className="bg-[#DBEAFE] text-[#1E40AF] rounded px-0.5 font-mono text-xs">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}
