import { useRef } from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { copyText } from "@/lib/copyText"
import { SHOWN_ONCE_NOTE, inviteUrl } from "./invitePresentation"

interface InviteLinkDialogProps {
  /** The one-time path from create/rotate; null closes the dialog. */
  invitePath: string | null
  clientLabel: string
  onClose: () => void
}

/**
 * S4 — the invite link, shown ONCE. Closing the dialog drops the only copy the
 * browser holds; the server keeps a hash only. "Copy new link" in S5 issues a
 * fresh one (and revokes this one) if it is lost.
 */
export function InviteLinkDialog({ invitePath, clientLabel, onClose }: InviteLinkDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const url = invitePath ? inviteUrl(invitePath) : ""

  async function handleCopy() {
    if (await copyText(url)) {
      toast.success("Invite link copied")
      return
    }
    // Fallback: select the text so the practitioner can copy it by hand.
    inputRef.current?.focus()
    inputRef.current?.select()
    toast.error("Could not copy the link — it is selected; copy it by hand.")
  }

  return (
    <Dialog open={invitePath !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite link for {clientLabel}</DialogTitle>
          <DialogDescription>{SHOWN_ONCE_NOTE}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="invite-link">Invite link</Label>
          <Input
            id="invite-link"
            ref={inputRef}
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Send it to your client yourself. When they sign up (or sign in) from this link they
            become your client. If they already have an account, the link connects it to you when
            they open it.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
            Done
          </Button>
          <Button type="button" className="min-h-11" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
            Copy link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
