import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BookTemplate } from "lucide-react"
import { useState } from "react"

type PromptWizardFormProps = {
  persona: string
  tone: string
  knowledgeDomain: string
  responseStyle: string
  constraints: string
  onPersonaChange: (v: string) => void
  onToneChange: (v: string) => void
  onKnowledgeDomainChange: (v: string) => void
  onResponseStyleChange: (v: string) => void
  onConstraintsChange: (v: string) => void
}

const TEMPLATES = {
  persona: [
    {
      label: "Empathetic Coach",
      text: "You are a warm, supportive coaching mentor who listens deeply and asks powerful questions. You create a safe space for reflection and growth, always leading with empathy before offering guidance.",
    },
    {
      label: "Direct Challenger",
      text: "You are a results-oriented coach who pushes users out of their comfort zone. You ask tough questions, challenge assumptions, and hold users accountable to their stated goals.",
    },
    {
      label: "PRISM Expert",
      text: "You are a certified PRISM practitioner who helps users understand behavioral preferences. You reference PRISM dimensions (Red/Gold/Green/Blue) to provide personalized coaching grounded in behavioral data.",
    },
  ],
  tone: [
    { label: "Professional & Supportive", text: "Professional and supportive" },
    { label: "Casual & Friendly", text: "Casual and friendly" },
    { label: "Formal & Authoritative", text: "Formal and authoritative" },
  ],
  knowledge: [
    {
      label: "PRISM & Behavioral",
      text: "PRISM behavioral framework, team dynamics, communication styles",
    },
    {
      label: "Career Development",
      text: "Career development, skill assessment, goal setting",
    },
    {
      label: "Leadership & Executive",
      text: "Leadership development, executive coaching, organizational change",
    },
  ],
  style: [
    {
      label: "Clarifying Questions First",
      text: "Ask clarifying questions before providing advice. Use bullet points for actionable steps.",
    },
    {
      label: "Structured with Headers",
      text: "Provide structured responses with headers. Include examples and analogies.",
    },
    {
      label: "Concise & Focused",
      text: "Keep responses concise (under 200 words). Focus on one key insight per response.",
    },
  ],
  constraints: [
    {
      label: "No Medical/Legal/Financial",
      text: "Never provide medical, legal, or financial advice. Redirect to appropriate professionals.",
    },
    {
      label: "PRISM Data Required",
      text: "Always reference PRISM behavioral data when available. Do not make assumptions about personality.",
    },
    {
      label: "Stay on Coaching Goals",
      text: "Limit responses to the user's current coaching goals. Avoid unsolicited advice on unrelated topics.",
    },
  ],
} as const

type TemplateKey = keyof typeof TEMPLATES

function TemplatePopover({
  field,
  currentValue,
  onAppend,
}: {
  field: TemplateKey
  currentValue: string
  onAppend: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const templates = TEMPLATES[field]

  const handleSelect = (text: string) => {
    const newValue = currentValue.trim()
      ? `${currentValue.trim()}\n${text}`
      : text
    onAppend(newValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <BookTemplate className="size-3" />
          Templates
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <div className="space-y-1">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Click to append to current value
          </p>
          {templates.map((t) => (
            <button
              key={t.label}
              type="button"
              className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100 transition-colors"
              onClick={() => handleSelect(t.text)}
            >
              <div className="font-medium text-slate-800">{t.label}</div>
              <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {t.text}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function PromptWizardForm({
  persona,
  tone,
  knowledgeDomain,
  responseStyle,
  constraints,
  onPersonaChange,
  onToneChange,
  onKnowledgeDomainChange,
  onResponseStyleChange,
  onConstraintsChange,
}: PromptWizardFormProps) {
  return (
    <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
      <Tabs defaultValue="persona" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="persona">Persona</TabsTrigger>
          <TabsTrigger value="tone">Tone</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="constraints">Constraints</TabsTrigger>
        </TabsList>

        <TabsContent value="persona" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="persona">Persona</Label>
            <TemplatePopover
              field="persona"
              currentValue={persona}
              onAppend={onPersonaChange}
            />
          </div>
          <Textarea
            id="persona"
            placeholder="Define the coach's persona, background, and character..."
            value={persona}
            onChange={(e) => onPersonaChange(e.target.value)}
            rows={12}
            className="resize-none"
          />
        </TabsContent>

        <TabsContent value="tone" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="tone">Tone</Label>
            <TemplatePopover
              field="tone"
              currentValue={tone}
              onAppend={onToneChange}
            />
          </div>
          <Textarea
            id="tone"
            placeholder="Describe the desired communication tone (warm, professional, casual, etc.)..."
            value={tone}
            onChange={(e) => onToneChange(e.target.value)}
            rows={12}
            className="resize-none"
          />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="knowledge">Knowledge Domain</Label>
            <TemplatePopover
              field="knowledge"
              currentValue={knowledgeDomain}
              onAppend={onKnowledgeDomainChange}
            />
          </div>
          <Textarea
            id="knowledge"
            placeholder="Specify the areas of expertise and knowledge the coach should demonstrate..."
            value={knowledgeDomain}
            onChange={(e) => onKnowledgeDomainChange(e.target.value)}
            rows={12}
            className="resize-none"
          />
        </TabsContent>

        <TabsContent value="style" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="style">Response Style</Label>
            <TemplatePopover
              field="style"
              currentValue={responseStyle}
              onAppend={onResponseStyleChange}
            />
          </div>
          <Textarea
            id="style"
            placeholder="Define how responses should be structured (length, format, examples, etc.)..."
            value={responseStyle}
            onChange={(e) => onResponseStyleChange(e.target.value)}
            rows={12}
            className="resize-none"
          />
        </TabsContent>

        <TabsContent value="constraints" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="constraints">Constraints</Label>
            <TemplatePopover
              field="constraints"
              currentValue={constraints}
              onAppend={onConstraintsChange}
            />
          </div>
          <Textarea
            id="constraints"
            placeholder="List any limitations, guardrails, or topics to avoid..."
            value={constraints}
            onChange={(e) => onConstraintsChange(e.target.value)}
            rows={12}
            className="resize-none"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
