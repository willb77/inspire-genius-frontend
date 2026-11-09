import { AlertTriangle, Copy, Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMyPracticeRegistration } from "@/hooks/practitioner/useMyPracticeRegistration"
import { useClientInvites } from "@/hooks/practitioner/useClientInvites"
import { ROUTES } from "@/constants/routes"
import { copyText } from "@/lib/copyText"
import type { MyPracticeRegistration } from "@/types/practitioner-practice"

export const NOT_REGISTERED_BANNER =
  "Surveys you invite will be raised on Inspire Genius's PRISM site until your account is registered."
export const DEACTIVATED_BANNER =
  "Your PRISM registration is deactivated. Surveys you invite will be raised on Inspire Genius's PRISM site until it is reactivated."
export const DARK_MESSAGE = "The Practitioner Programme is not switched on yet."
export const LOAD_ERROR = "Your PRISM registration could not be loaded just now. Please try again later."
export const INVITES_OFF_TITLE = "Client invite links are not switched on for your practice yet."

function clientMessage(code: string): string {
  return (
    `I'd like to work with you on Inspire Genius. After you sign in, open Settings, ` +
    `choose "Have a practitioner code?" and enter my code: ${code}`
  )
}

async function copyWithToast(text: string, what: string) {
  if (await copyText(text)) toast.success(`${what} copied`)
  else toast.error(`Could not copy the ${what.toLowerCase()} — select it and copy it by hand.`)
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-sm">{value || "—"}</dd>
    </div>
  )
}

function Registered({ registration }: { registration: MyPracticeRegistration }) {
  const code = registration.practitionerCode
  return (
    <>
      {!registration.active && <Banner>{DEACTIVATED_BANNER}</Banner>}

      <Card>
        <CardHeader>
          <CardTitle>Your client code</CardTitle>
          <CardDescription>
            A client who signed up on their own enters this once, in Settings, to become your client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {code ? (
            <>
              <p className="font-mono text-2xl tracking-widest" data-testid="practice-code">
                {code}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => copyWithToast(code, "Code")}>
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyWithToast(clientMessage(code), "Message")}
                >
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy a message for your client
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No code has been issued yet. Please contact support.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your PRISM account</CardTitle>
          <CardDescription>
            Your clients&apos; surveys are raised under these identifiers. Something wrong? Contact support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <ReadOnlyField label="Site ID" value={registration.siteId} />
            <ReadOnlyField label="Client ID" value={registration.clientId} />
            <ReadOnlyField label="Reference" value={registration.reference} />
          </dl>
        </CardContent>
      </Card>
    </>
  )
}

export default function MyPractice() {
  const { data, isLoading, error } = useMyPracticeRegistration()
  const navigate = useNavigate()
  // PI-4: enabled only when the invite routes apply to this practitioner. The
  // invite itself is made per client, on the Clients page (S4).
  const invites = useClientInvites()
  const invitesLive = invites.data?.state === "live"

  return (
    <PractitionerLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">My PRISM practice</h1>
            <p className="text-sm text-muted-foreground">
              Your client code and the PRISM account your clients&apos; surveys are raised under.
            </p>
          </div>
          <Button
            type="button"
            className="min-h-11"
            disabled={!invitesLive}
            title={invitesLive ? undefined : INVITES_OFF_TITLE}
            onClick={() => navigate(ROUTES.PRACTITIONER.CLIENTS)}
          >
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Invite a client
          </Button>
        </div>

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading your registration…
          </p>
        )}
        {!isLoading && error && <Banner>{LOAD_ERROR}</Banner>}
        {data?.state === "dark" && <Banner>{DARK_MESSAGE}</Banner>}
        {data?.state === "missing" && <Banner>{NOT_REGISTERED_BANNER}</Banner>}
        {data?.state === "registered" && <Registered registration={data.registration} />}
      </div>
    </PractitionerLayout>
  )
}
