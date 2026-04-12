import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Mic, Info, DollarSign, Save, Volume2, Play, Square } from "lucide-react"
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
    value: "aws_transcribe",
    label: "AWS Transcribe",
    description: "Enterprise-grade, real-time streaming. ~$0.024/min (medical/custom models).",
    badge: "Enterprise",
    badgeVariant: "secondary" as const,
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
    description: "Natural voices (alloy, echo, fable, onyx, nova, shimmer). ~$0.015 / 1K chars.",
    badge: "Current",
    badgeVariant: "secondary" as const,
  },
  {
    value: "google",
    label: "Google Cloud TTS",
    description: "400+ voices across 50+ languages. Neural2 and Studio quality. ~$0.016 / 1M chars.",
    badge: "Multilingual",
    badgeVariant: "default" as const,
  },
  {
    value: "elevenlabs",
    label: "ElevenLabs",
    description: "Highest quality voice cloning and synthesis. ~$0.30 / 1K chars.",
    badge: "Premium",
    badgeVariant: "outline" as const,
  },
  {
    value: "aws_polly",
    label: "AWS Polly",
    description: "Neural and standard voices, SSML support. ~$0.016 / 1M chars.",
    badge: "Cost-effective",
    badgeVariant: "secondary" as const,
  },
]

const COST_ESTIMATES = [
  { provider: "Deepgram Nova-2", sttCost: "$0.0043/min", ttsCost: "—", savings: "~28% vs Whisper" },
  { provider: "OpenAI Whisper + TTS", sttCost: "$0.006/min", ttsCost: "$0.015/1K chars", savings: "—" },
  { provider: "Google Cloud TTS", sttCost: "—", ttsCost: "$0.016/1M chars", savings: "Lowest TTS cost" },
  { provider: "AWS Polly", sttCost: "—", ttsCost: "$0.016/1M chars", savings: "Same as Google" },
  { provider: "AWS Transcribe", sttCost: "$0.024/min", ttsCost: "—", savings: "Enterprise features" },
  { provider: "ElevenLabs", sttCost: "—", ttsCost: "$0.30/1K chars", savings: "Highest quality" },
]

const VOICES_BY_PROVIDER: Record<string, { id: string; name: string; gender: string; style: string }[]> = {
  openai: [
    { id: "alloy", name: "Alloy", gender: "Neutral", style: "Balanced" },
    { id: "echo", name: "Echo", gender: "Male", style: "Warm" },
    { id: "fable", name: "Fable", gender: "Male", style: "Expressive" },
    { id: "onyx", name: "Onyx", gender: "Male", style: "Deep" },
    { id: "nova", name: "Nova", gender: "Female", style: "Friendly" },
    { id: "shimmer", name: "Shimmer", gender: "Female", style: "Clear" },
  ],
  google: [
    { id: "en-US-Neural2-A", name: "Neural2-A", gender: "Male", style: "Standard" },
    { id: "en-US-Neural2-C", name: "Neural2-C", gender: "Female", style: "Standard" },
    { id: "en-US-Neural2-D", name: "Neural2-D", gender: "Male", style: "Casual" },
    { id: "en-US-Neural2-F", name: "Neural2-F", gender: "Female", style: "Friendly" },
    { id: "en-US-Studio-M", name: "Studio-M", gender: "Male", style: "Studio" },
    { id: "en-US-Studio-O", name: "Studio-O", gender: "Female", style: "Studio" },
  ],
  elevenlabs: [
    { id: "rachel", name: "Rachel", gender: "Female", style: "Conversational" },
    { id: "adam", name: "Adam", gender: "Male", style: "Narrative" },
    { id: "antoni", name: "Antoni", gender: "Male", style: "Warm" },
    { id: "bella", name: "Bella", gender: "Female", style: "Soft" },
    { id: "domi", name: "Domi", gender: "Female", style: "Strong" },
    { id: "josh", name: "Josh", gender: "Male", style: "Deep" },
  ],
  aws_polly: [
    { id: "Joanna", name: "Joanna", gender: "Female", style: "Neural" },
    { id: "Matthew", name: "Matthew", gender: "Male", style: "Neural" },
    { id: "Ivy", name: "Ivy", gender: "Female (child)", style: "Neural" },
    { id: "Kendra", name: "Kendra", gender: "Female", style: "Neural" },
    { id: "Kevin", name: "Kevin", gender: "Male (child)", style: "Neural" },
    { id: "Salli", name: "Salli", gender: "Female", style: "Neural" },
  ],
}

function VoicePreviewGrid({ provider }: { provider: string }) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([])
  const voices = VOICES_BY_PROVIDER[provider] ?? VOICES_BY_PROVIDER.openai ?? []

  // Load browser voices (async on some browsers)
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis?.getVoices() ?? []
      if (v.length > 0) setBrowserVoices(v)
    }
    loadVoices()
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices)
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices)
  }, [])

  const findBrowserVoice = (gender: string, _style: string): SpeechSynthesisVoice | undefined => {
    if (browserVoices.length === 0) return undefined
    const isFemale = gender.toLowerCase().includes("female")
    // Try to find a voice matching gender
    const genderMatch = browserVoices.filter(v => {
      const name = v.name.toLowerCase()
      if (isFemale) return name.includes("female") || name.includes("samantha") || name.includes("karen") || name.includes("victoria") || name.includes("fiona")
      return name.includes("male") || name.includes("daniel") || name.includes("alex") || name.includes("fred") || name.includes("thomas")
    })
    return genderMatch[0] ?? browserVoices[Math.floor(Math.random() * browserVoices.length)]
  }

  const getVoiceParams = (style: string): { rate: number; pitch: number } => {
    switch (style.toLowerCase()) {
      case "deep": return { rate: 0.85, pitch: 0.6 }
      case "warm": return { rate: 0.92, pitch: 0.85 }
      case "expressive": return { rate: 1.05, pitch: 1.1 }
      case "friendly": return { rate: 1.0, pitch: 1.05 }
      case "clear": return { rate: 0.95, pitch: 1.15 }
      case "balanced": case "neutral": return { rate: 0.95, pitch: 1.0 }
      case "soft": return { rate: 0.88, pitch: 1.1 }
      case "strong": return { rate: 1.0, pitch: 0.8 }
      case "conversational": return { rate: 0.97, pitch: 1.0 }
      case "narrative": return { rate: 0.9, pitch: 0.9 }
      case "standard": return { rate: 0.95, pitch: 1.0 }
      case "casual": return { rate: 1.02, pitch: 0.95 }
      case "studio": return { rate: 0.93, pitch: 0.95 }
      case "neural": return { rate: 0.95, pitch: 1.0 }
      default: return { rate: 1.0, pitch: 1.0 }
    }
  }

  const handleTest = (voiceId: string) => {
    if (playingId === voiceId) {
      window.speechSynthesis?.cancel()
      setPlayingId(null)
      return
    }
    window.speechSynthesis?.cancel()
    setPlayingId(voiceId)
    const voice = voices.find(v => v.id === voiceId)
    const utterance = new SpeechSynthesisUtterance(
      `Hello, I'm ${voice?.name ?? voiceId}. I'll be your AI coaching assistant. How can I help you today?`
    )

    // Set voice parameters for distinct sound
    const params = getVoiceParams(voice?.style ?? "balanced")
    utterance.rate = params.rate
    utterance.pitch = params.pitch

    // Try to find a matching browser voice
    const browserVoice = findBrowserVoice(voice?.gender ?? "neutral", voice?.style ?? "balanced")
    if (browserVoice) utterance.voice = browserVoice

    utterance.onend = () => setPlayingId(null)
    utterance.onerror = () => setPlayingId(null)
    window.speechSynthesis?.speak(utterance)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {voices.map(voice => (
        <div key={voice.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
          <button
            onClick={() => handleTest(voice.id)}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors shrink-0"
          >
            {playingId === voice.id ? <Square className="h-3 w-3 text-slate-700" /> : <Play className="h-3 w-3 text-slate-700 ml-0.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">{voice.name}</p>
            <p className="text-xs text-slate-500">{voice.gender} · {voice.style}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400">Rate: {getVoiceParams(voice.style).rate}</p>
            <p className="text-[10px] text-slate-400">Pitch: {getVoiceParams(voice.style).pitch}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

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
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 text-amber-800 text-xs">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Using default configuration — API unavailable. Changes will be saved when the connection is restored.</span>
                </div>
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

        {/* Available Voices */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Available Voices</CardTitle>
            </div>
            <CardDescription>Preview and configure voices for the selected TTS provider</CardDescription>
          </CardHeader>
          <CardContent>
            <VoicePreviewGrid provider={selectedTts} />
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
                    <th className="text-left py-2 pr-4 font-medium text-slate-600">TTS Cost</th>
                    <th className="text-left py-2 font-medium text-slate-600">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {COST_ESTIMATES.map((row) => (
                    <tr key={row.provider}>
                      <td className="py-2 pr-4 text-slate-900">{row.provider}</td>
                      <td className="py-2 pr-4 text-slate-700 font-mono">{row.sttCost}</td>
                      <td className="py-2 pr-4 text-slate-700 font-mono">{row.ttsCost}</td>
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
            {isPending ? "Saving..." : "Save Changes"}
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
