import { useState } from "react"
import { toast } from "sonner"
import { Mic, Info, DollarSign, Save } from "lucide-react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useVoiceConfig, useUpdateVoiceConfig } from "@/hooks/super-admin/useVoiceConfig"

const STT_OPTIONS = [
  {
    value: "openai",
    label: "OpenAI Whisper",
    description: "Reliable, broad language support. ~$0.006/min.",
    badge: "Stable",
    badgeVariant: "secondary" as const,
  },
  {
    value: "deepgram",
    label: "Deepgram Nova-2",
    description: "Low latency, real-time streaming. ~$0.0043/min.",
    badge: "Faster",
    badgeVariant: "default" as const,
  },
  {
    value: "auto",
    label: "Auto (Deepgram → Whisper fallback)",
    description: "Uses Deepgram when language is supported, falls back to Whisper on error.",
    badge: "Recommended",
    badgeVariant: "outline" as const,
  },
]

const TTS_OPTIONS = [
  {
    value: "openai",
    label: "OpenAI TTS",
    description: "Natural voices (alloy, echo, fable…). ~$0.015 / 1K chars.",
    badge: "Only option",
    badgeVariant: "secondary" as const,
  },
]

const COST_ESTIMATES = [
  { provider: "Deepgram Nova-2", sttCost: "$0.0043/min", savings: "~28% vs Whisper" },
  { provider: "OpenAI Whisper", sttCost: "$0.006/min", savings: "—" },
  { provider: "Auto mode", sttCost: "~$0.005/min avg", savings: "Depends on language mix" },
]

type RadioOptionProps = {
  id: string
  name: string
  value: string
  selected: string
  label: string
  description: string
  badge: string
  badgeVariant: "default" | "secondary" | "outline" | "destructive"
  onChange: (v: string) => void
}

function RadioOption({ id, name, value, selected, label, description, badge, badgeVariant, onChange }: RadioOptionProps) {
  const checked = selected === value
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        checked
          ? "border-slate-900 bg-slate-50"
          : "border-slate-200 hover:bg-slate-50"
      }`}
    >
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-0.5 accent-slate-900"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          <Badge variant={badgeVariant} className="text-xs">{badge}</Badge>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </label>
  )
}

export default function VoiceProviderSettings() {
  const { data: configData, isLoading, isError } = useVoiceConfig()
  const { mutate: saveConfig, isPending } = useUpdateVoiceConfig()

  const config = configData?.data

  const [pendingStt, setPendingStt] = useState<string | null>(null)
  const [pendingTts, setPendingTts] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const currentStt = config?.stt_provider ?? "openai"
  const currentTts = config?.tts_provider ?? "openai"

  const selectedStt = pendingStt ?? currentStt
  const selectedTts = pendingTts ?? currentTts

  const isDirty = selectedStt !== currentStt || selectedTts !== currentTts

  function handleConfirm() {
    const payload: Record<string, string> = {}
    if (selectedStt !== currentStt) payload.stt_provider = selectedStt
    if (selectedTts !== currentTts) payload.tts_provider = selectedTts

    saveConfig(payload, {
      onSuccess: () => {
        toast.success("Voice provider settings saved")
        setPendingStt(null)
        setPendingTts(null)
      },
      onError: () => {
        toast.error("Failed to save voice settings")
      },
    })
    setConfirmOpen(false)
  }

  return (
    <SuperAdminLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Mic className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Voice Provider Settings</h1>
            <p className="text-sm text-slate-500">Configure STT and TTS providers for AI voice features</p>
          </div>
        </div>

        {/* STT Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Speech-to-Text (STT)</CardTitle>
            <CardDescription>Provider used to transcribe user audio in voice sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : isError ? (
              <p className="text-sm text-red-500">Failed to load configuration</p>
            ) : (
              <div className="space-y-3">
                {STT_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    id={`stt-${opt.value}`}
                    name="stt_provider"
                    value={opt.value}
                    selected={selectedStt}
                    label={opt.label}
                    description={opt.description}
                    badge={opt.badge}
                    badgeVariant={opt.badgeVariant}
                    onChange={setPendingStt}
                  />
                ))}
              </div>
            )}
            {config?.stt_updated_by && (
              <p className="mt-3 text-xs text-slate-400">
                Last updated by {config.stt_updated_by}
                {config.stt_updated_at
                  ? ` · ${new Date(config.stt_updated_at).toLocaleDateString()}`
                  : ""}
              </p>
            )}
          </CardContent>
        </Card>

        {/* TTS Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Text-to-Speech (TTS)</CardTitle>
            <CardDescription>Provider used to synthesize AI voice responses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-3">
                {TTS_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    id={`tts-${opt.value}`}
                    name="tts_provider"
                    value={opt.value}
                    selected={selectedTts}
                    label={opt.label}
                    description={opt.description}
                    badge={opt.badge}
                    badgeVariant={opt.badgeVariant}
                    onChange={setPendingTts}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Comparison */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Estimated Costs</CardTitle>
            </div>
            <CardDescription>Approximate cost per minute of voice usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 pr-4 font-medium text-slate-600">Provider</th>
                    <th className="text-left py-2 pr-4 font-medium text-slate-600">STT Cost</th>
                    <th className="text-left py-2 font-medium text-slate-600">vs Whisper</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {COST_ESTIMATES.map((row) => (
                    <tr key={row.provider}>
                      <td className="py-2 pr-4 text-slate-900">{row.provider}</td>
                      <td className="py-2 pr-4 text-slate-700 font-mono">{row.sttCost}</td>
                      <td className="py-2 text-emerald-600 text-xs">{row.savings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Costs are estimates based on public pricing. Actual usage billed via AWS/provider accounts.</span>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!isDirty || isPending || isLoading}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply voice provider changes?</DialogTitle>
            <DialogDescription asChild>
              <div>
                {selectedStt !== currentStt && (
                  <p>
                    STT will switch from <strong>{currentStt}</strong> to <strong>{selectedStt}</strong>.
                  </p>
                )}
                {selectedTts !== currentTts && (
                  <p className="mt-1">
                    TTS will switch from <strong>{currentTts}</strong> to <strong>{selectedTts}</strong>.
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Changes take effect on the next voice request (within ~60 seconds).
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  )
}
