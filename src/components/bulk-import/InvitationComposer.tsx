import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Eye, ArrowRight, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ImportedUser } from "@/types/bulk-import"

type InvitationComposerProps = {
  importedUsers: ImportedUser[]
  customMessage: string
  onCustomMessageChange: (message: string) => void
  onContinue: () => void
}

const MAX_CHARS = 500

function EmailPreview({
  firstName,
  customMessage,
  className,
}: {
  firstName: string
  customMessage: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto max-w-[520px] rounded-lg border border-slate-200 bg-white font-sans text-sm text-slate-700 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="rounded-t-lg bg-blue-600 px-6 py-5 text-center">
        <h2 className="text-xl font-bold tracking-wide text-white">
          Inspire Genius
        </h2>
        <p className="mt-1 text-xs text-blue-100">AI Coaching Platform</p>
      </div>

      {/* Body */}
      <div className="space-y-4 px-6 py-6">
        {/* Greeting */}
        <p className="text-base text-slate-800">
          Hi {firstName || "there"},
        </p>

        {/* Platform description */}
        <p className="leading-relaxed text-slate-600">
          You have been invited to join{" "}
          <span className="font-semibold text-slate-800">Inspire Genius</span>,
          an AI-powered coaching platform designed to help you unlock your
          potential, build self-awareness, and accelerate your personal and
          professional growth.
        </p>

        {/* Custom message */}
        {customMessage.trim() && (
          <div className="rounded-md border-l-4 border-blue-500 bg-blue-50 px-4 py-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-blue-600">
              A message from your administrator
            </p>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
              {customMessage}
            </p>
          </div>
        )}

        {/* CTA Button */}
        <div className="py-2 text-center">
          <span className="inline-block cursor-default rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md">
            Join Inspire Genius
          </span>
        </div>

        {/* Instructions */}
        <div className="rounded-md bg-slate-50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Getting started
          </p>
          <ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">
            <li>Click the button above to accept your invitation</li>
            <li>Create your account with a secure password</li>
            <li>Complete a short onboarding questionnaire</li>
            <li>Start your first coaching session</li>
          </ol>
        </div>

        <p className="text-xs text-slate-400">
          If the button above does not work, copy and paste the link from the
          email into your browser. This invitation will expire in 7 days.
        </p>
      </div>

      {/* Footer */}
      <div className="rounded-b-lg border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-xs text-slate-400">
        <p>Inspire Genius &mdash; AI Coaching Platform</p>
        <p className="mt-1">
          This is an automated invitation. Please do not reply directly to this
          email.
        </p>
      </div>
    </div>
  )
}

export function InvitationComposer({
  importedUsers,
  customMessage,
  onCustomMessageChange,
  onContinue,
}: InvitationComposerProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  const firstUser = importedUsers[0]
  const previewName = firstUser?.fname || firstUser?.email1?.split("@")[0] || "User"
  const charCount = customMessage.length
  const isOverLimit = charCount > MAX_CHARS

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <p className="text-sm text-muted-foreground mb-4 lg:col-span-2">
        Compose a custom welcome message for the invitation emails. This message will be included in the email sent to each imported user.
      </p>
      {/* Left panel - Compose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-blue-600" />
            Compose Invitation Email
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add an optional personal message to the invitation email. This will
            appear in a highlighted section of the email template.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label
              htmlFor="custom-message"
              className="mb-1.5 block text-sm font-medium"
            >
              Custom Message{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              id="custom-message"
              placeholder="Welcome to the team! We're excited to have you join our coaching platform..."
              value={customMessage}
              onChange={(e) => onCustomMessageChange(e.target.value)}
              rows={6}
              className={cn(
                "resize-none",
                isOverLimit && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p
                className={cn(
                  "text-xs",
                  isOverLimit ? "text-red-500" : "text-muted-foreground"
                )}
              >
                {charCount}/{MAX_CHARS} characters
              </p>
              {isOverLimit && (
                <Badge variant="destructive" className="text-xs">
                  Over limit
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview as Email
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Email Preview</DialogTitle>
                </DialogHeader>
                <div className="rounded-lg bg-slate-100 p-6">
                  <EmailPreview
                    firstName={previewName}
                    customMessage={customMessage}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={onContinue}
              disabled={isOverLimit}
              className="ml-auto"
            >
              Continue to Select Recipients
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right panel - Live preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-slate-500" />
            Live Preview
            <Badge variant="secondary" className="ml-auto text-xs font-normal">
              Previewing as: {previewName}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-slate-100 p-4">
            <EmailPreview
              firstName={previewName}
              customMessage={customMessage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
