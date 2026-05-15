import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

type PromptPreviewPanelProps = {
  persona: string
  tone: string
  knowledgeDomain: string
  responseStyle: string
  constraints: string
}

function assemblePrompt({ persona, tone, knowledgeDomain, responseStyle, constraints }: PromptPreviewPanelProps): string {
  const sections: string[] = []
  if (persona.trim()) sections.push(`## Persona\n${persona.trim()}`)
  if (tone.trim()) sections.push(`## Tone\n${tone.trim()}`)
  if (knowledgeDomain.trim()) sections.push(`## Knowledge Domain\n${knowledgeDomain.trim()}`)
  if (responseStyle.trim()) sections.push(`## Response Style\n${responseStyle.trim()}`)
  if (constraints.trim()) sections.push(`## Constraints\n${constraints.trim()}`)
  return sections.join("\n\n")
}

export default function PromptPreviewPanel(props: PromptPreviewPanelProps) {
  const [copied, setCopied] = useState(false)
  const assembled = assemblePrompt(props)

  const handleCopy = () => {
    navigator.clipboard.writeText(assembled)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Live Preview</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 rounded-lg p-4 min-h-[400px] max-h-[calc(100vh-20rem)] overflow-auto font-mono text-foreground/80">
          {assembled || "Fill in the sections to see the assembled prompt..."}
        </pre>

        <details className="mt-4 text-xs">
          <summary className="font-semibold cursor-pointer text-slate-700 hover:text-slate-900">
            Markup Reference — Variables & Tags
          </summary>
          <div className="mt-2 space-y-3 bg-slate-50 rounded-lg p-4">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Dynamic Variables (replaced at runtime)</h4>
              <ul className="space-y-1 text-slate-600">
                <li><code className="bg-white px-1 rounded text-blue-700">{'{user_name}'}</code> — Current user's display name</li>
                <li><code className="bg-white px-1 rounded text-blue-700">{'{knowledge_base}'}</code> — Injected knowledge from uploaded documents (~500-2000 tokens)</li>
                <li><code className="bg-white px-1 rounded text-blue-700">{'{conversation_history}'}</code> — Recent chat context (~200-1000 tokens)</li>
                <li><code className="bg-white px-1 rounded text-blue-700">{'{prism_profile}'}</code> — User's PRISM behavioral assessment data (~100-300 tokens)</li>
                <li><code className="bg-white px-1 rounded text-blue-700">{'{current_date}'}</code> — Today's date</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Section Tags (define prompt structure)</h4>
              <ul className="space-y-1 text-slate-600">
                <li><code className="bg-white px-1 rounded text-purple-700">{'<INTERNAL_EXPERTISE>'}</code> — Marks domain knowledge the agent should reference but not quote directly. Content is used for reasoning but not shown to users. (~200-500 tokens)</li>
                <li><code className="bg-white px-1 rounded text-purple-700">{'<USER_CASE_FILES>'}</code> — Placeholder for user-specific data injected per session (goals, history, preferences). (~100-400 tokens)</li>
                <li><code className="bg-white px-1 rounded text-purple-700">{'<GUARDRAILS>'}</code> — Safety constraints and response boundaries. Always included. (~50-200 tokens)</li>
                <li><code className="bg-white px-1 rounded text-purple-700">{'<FEW_SHOT_EXAMPLES>'}</code> — Example Q&A pairs that guide response format. (~200-600 tokens per example)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Context Window Impact</h4>
              <p className="text-slate-600">
                Each variable/tag consumes tokens from the context window (128K for Sonnet, 200K for Opus).
                A typical system prompt with all variables uses ~2,000-4,000 tokens. Keep the base prompt
                under 2,000 tokens to leave room for conversation history and knowledge retrieval.
              </p>
              <p className="text-slate-600 mt-1">
                <strong>Tip:</strong> Use <code className="bg-white px-1 rounded">{'<INTERNAL_EXPERTISE>'}</code> for
                background knowledge (not shown to users) and <code className="bg-white px-1 rounded">{'{knowledge_base}'}</code> for
                retrieved document chunks (shown contextually).
              </p>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}

