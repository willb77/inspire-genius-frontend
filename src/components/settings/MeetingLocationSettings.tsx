/**
 * Default meeting location (MSCH-2).
 *
 * One free-text field — a video meeting link, a phone number or a mailing
 * address — saved on the server against the signed-in scheduler, so it follows
 * them to any device. The team Schedule form pre-fills its Location box from
 * it, and every invite carries it.
 *
 * Shown to the roles the server lets schedule (manager, company-admin,
 * super-admin); the server refuses everyone else regardless.
 */
import { useState } from "react"
import { Loader2, MapPin, Save } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useSaveTeamSchedulePreferences,
  useTeamSchedulePreferences,
} from "@/hooks/manager/useTeamSchedule"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { MAX_LOCATION } from "@/types/manager/teamSchedule"

export default function MeetingLocationSettings() {
  const prefs = useTeamSchedulePreferences()
  const save = useSaveTeamSchedulePreferences()
  // null = not edited yet, so the field shows what is saved.
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const saved = prefs.data?.defaultLocation ?? ""
  const value = draft ?? saved
  const tooLong = value.trim().length > MAX_LOCATION
  const unchanged = value.trim() === saved

  const handleSave = () => {
    setError(null)
    save.mutate(
      { defaultLocation: value.trim() || null },
      {
        onSuccess: (result) => {
          setDraft(null)
          toast.success(result.defaultLocation ? "Default location saved" : "Default location cleared")
        },
        onError: (err) => setError(apiErrorMessage(err, "Could not save your default location.")),
      },
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-left">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[#466BC4]" />
          Meeting location
        </CardTitle>
      </CardHeader>
      <CardContent className="text-left space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="default-meeting-location">Default location for sessions you schedule</Label>
          <Input
            id="default-meeting-location"
            value={value}
            disabled={prefs.isLoading}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="A video meeting link, a phone number or an address"
            aria-invalid={tooLong}
          />
          <p className="text-xs text-[#6b7280]">
            Fills in the Location box on Schedule. You can still change it for each booking.
          </p>
          {tooLong && (
            <p className="text-xs text-[#EF4444]">At most {MAX_LOCATION} characters.</p>
          )}
        </div>

        {prefs.error && (
          <p role="alert" className="text-sm text-[#EF4444]">
            {apiErrorMessage(prefs.error, "Could not load your default location.")}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-[#EF4444]">
            {error}
          </p>
        )}

        <Button
          onClick={handleSave}
          disabled={prefs.isLoading || save.isPending || tooLong || unchanged}
          className="bg-[#466BC4] hover:bg-[#3A59A6] text-white"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save
        </Button>
      </CardContent>
    </Card>
  )
}
