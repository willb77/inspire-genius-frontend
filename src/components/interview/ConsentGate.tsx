/**
 * ConsentGate — shown BEFORE any capture in a real, scored interview.
 *
 * Presents the recording notice, lets the interviewer pick the capture mode
 * (audio-with-consent vs the default no_audio), and requires an explicit
 * acknowledgement before proceeding. Emits `{captured:true, mode, method:
 * "in_app_ack"}` on confirm — the exact `LiveConsent` shape the backend
 * expects at session creation.
 */
import { useState } from "react"
import { Mic, MicOff, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { ConsentMode, LiveConsent } from "@/services/interview/live.service"

export type ConsentGateProps = {
  candidateName?: string
  onProceed: (consent: LiveConsent) => void
}

export default function ConsentGate({ candidateName, onProceed }: ConsentGateProps) {
  const [mode, setMode] = useState<ConsentMode>("no_audio")
  const [acknowledged, setAcknowledged] = useState(false)

  const canProceed = acknowledged

  const handleProceed = () => {
    if (!canProceed) return
    onProceed({ captured: true, mode, method: "in_app_ack" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-indigo-600" /> Recording &amp; consent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          {candidateName ? `Before you begin interviewing ${candidateName}, ` : "Before you begin, "}
          confirm how this interview will be captured. Answer text is always captured for
          scoring; audio capture is separate and off by default.
        </p>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Capture mode
          </legend>
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
            <input
              type="radio"
              name="consent-mode"
              value="no_audio"
              checked={mode === "no_audio"}
              onChange={() => setMode("no_audio")}
              className="mt-1"
            />
            <span>
              <span className="flex items-center gap-1 font-medium">
                <MicOff className="h-3.5 w-3.5" /> No audio (default)
              </span>
              <span className="block text-xs text-slate-500">
                Only typed/dictated answer text is captured for scoring. No audio is recorded or stored.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">
            <input
              type="radio"
              name="consent-mode"
              value="audio"
              checked={mode === "audio"}
              onChange={() => setMode("audio")}
              className="mt-1"
            />
            <span>
              <span className="flex items-center gap-1 font-medium">
                <Mic className="h-3.5 w-3.5" /> Audio, with consent
              </span>
              <span className="block text-xs text-slate-500">
                Select this ONLY after the candidate has been informed and has explicitly
                consented — out loud or in writing — to voice capture during this interview.
              </span>
            </span>
          </label>
        </fieldset>

        <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(v === true)}
            className="mt-0.5"
          />
          <span>
            I confirm the candidate has been informed this is a scored interview
            {mode === "audio" ? " and has consented to audio capture" : ""}, and I am
            authorized to proceed.
          </span>
        </label>

        <Button onClick={handleProceed} disabled={!canProceed}>
          Acknowledge &amp; continue
        </Button>
      </CardContent>
    </Card>
  )
}
