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
      </CardContent>
    </Card>
  )
}

