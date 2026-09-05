/**
 * Sharing — who can see my goals (Goals offering, Phase 3).
 *
 * Goals are private until the person shares them with a specific someone, for
 * a fixed term they can see and renew, and can take back at any time. Rank
 * buys nobody a look (D6, D9). This page is the whole of that decision:
 *
 *   - the people they could share with, each with an on/off switch, the
 *     expiry and a Renew;
 *   - requests waiting on them, with the requester's stated reason;
 *   - add a person by exact email;
 *   - "what they see": the coach's own goal card, rendered with the coach's
 *     own component, so the preview cannot drift from the real thing.
 *
 * Four states render distinctly: loading, error, empty, and — per person —
 * not shared. A source that could not be read is reported, never rendered as
 * "you have no managers". No success message appears before its mutation has
 * settled.
 */
import { useState, type FormEvent } from "react";
import { Eye, Loader2, Mail, RefreshCw, Search, ShieldAlert, UserPlus } from "lucide-react";
import { PageHead, Card, Callout } from "@/pages/summit/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CoachGoalCard } from "@/components/manager/development/tabs/GoalsPanel";
import { useMyGoals } from "@/hooks/summit/useMyGoals";
import {
  useAccessLog,
  useExtendGrant,
  useLookupPerson,
  useMyGrants,
  useOfferAccess,
  usePeople,
  useRespondToRequest,
  useRevokeGrant,
} from "@/hooks/consent/useVisibility";
import type { AccessLogRow, LookupResult, MyGrantRow, PersonKind, VisibilityPerson } from "@/types/consent";

const KIND_LABEL: Record<PersonKind, string> = {
  manager_of_record: "Your manager",
  roster_manager: "Manager (roster)",
  practitioner: "Your coach",
  requester: "Asked for access",
};

const SOURCE_LABEL: Record<string, string> = {
  managers_of_record: "your manager of record",
  roster_managers: "managers who added you to a roster",
  practitioners: "your coach",
  requesters: "requests",
};

const GOALS_ONLY = { goals: true } as const;

function errorText(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return "That didn't save. Nothing was changed — try again.";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isLiveGoalsGrant(p: VisibilityPerson): boolean {
  const g = p.grant;
  if (!g || g.status !== "granted") return false;
  if (g.expiresAt && new Date(g.expiresAt).getTime() <= Date.now()) return false;
  return g.categories?.goals === true;
}

/** One person: name, relation, a switch, the term, Renew. */
function PersonRow({ person }: { person: VisibilityPerson }) {
  const offer = useOfferAccess();
  const revoke = useRevokeGrant();
  const extend = useExtendGrant();
  const shared = isLiveGoalsGrant(person);
  const pending = offer.isPending || revoke.isPending || extend.isPending;
  const error = offer.error ?? revoke.error ?? extend.error;
  const isPendingRequest = person.grant?.status === "pending";

  return (
    <li className="flex flex-col gap-2 border-b border-[#F1ECE2] py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-[#0B1B33]">
            {person.displayName || person.email || "Someone"}
          </div>
          <div className="truncate text-[12px] text-[#13294B]/70">
            {person.kinds.map((k) => KIND_LABEL[k]).join(" · ")}
            {person.email ? ` · ${person.email}` : ""}
          </div>
        </div>
        {isPendingRequest ? (
          <span className="rounded-full bg-[#C88B1B]/15 px-2.5 py-1 text-[11.5px] font-semibold text-[#A9720F]">
            Waiting on you — see requests below
          </span>
        ) : (
          <label className="flex items-center gap-2 text-[12.5px] font-semibold text-[#13294B]">
            <Switch
              checked={shared}
              disabled={pending}
              aria-label={`Share goals with ${person.displayName || person.email || "this person"}`}
              onCheckedChange={(checked) => {
                if (checked) {
                  offer.mutate({ granteeUserId: person.userId, categories: GOALS_ONLY });
                } else if (person.grant) {
                  revoke.mutate(person.grant.id);
                }
              }}
            />
            {shared ? "Sharing" : "Not shared"}
          </label>
        )}
        {pending && <Loader2 className="h-4 w-4 animate-spin text-[#7C93B5]" aria-hidden />}
      </div>
      {shared && person.grant && (
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#13294B]/75">
          <span>Until {formatDate(person.grant.expiresAt)}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            disabled={pending}
            onClick={() => extend.mutate({ grantId: person.grant!.id, days: 365 })}
          >
            <RefreshCw className="mr-1 h-3 w-3" aria-hidden /> Renew for a year
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[12.5px] text-[#C2614F]">
          {errorText(error)}
        </p>
      )}
    </li>
  );
}

/** A request waiting on the person, with the reason the requester gave. */
function RequestRow({ row, name }: { row: MyGrantRow; name: string }) {
  const respond = useRespondToRequest();
  return (
    <li className="flex flex-col gap-2 border-b border-[#F1ECE2] py-3 last:border-b-0">
      <div className="text-[14px] font-bold text-[#0B1B33]">{name}</div>
      <p className="text-[13px] text-[#13294B]/80">
        {row.reason ? <>&ldquo;{row.reason}&rdquo;</> : <em>No reason given.</em>}
        {row.requested_at ? <span className="text-[#13294B]/60"> · asked {formatDate(row.requested_at)}</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ grantId: row.id, approve: true, categories: GOALS_ONLY })}
        >
          Share my goals
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ grantId: row.id, approve: false })}
        >
          Decline
        </Button>
        {respond.isPending && <Loader2 className="h-4 w-4 animate-spin text-[#7C93B5]" aria-hidden />}
      </div>
      {respond.error && (
        <p role="alert" className="text-[12.5px] text-[#C2614F]">
          {errorText(respond.error)}
        </p>
      )}
    </li>
  );
}

const SURFACE_LABEL: Record<string, string> = {
  "growth:goals": "read your goals",
  "growth:goals:super-admin": "read your goals (platform admin)",
  "growth:dossier": "opened your development dossier",
  "growth:dossier:super-admin": "opened your development dossier (platform admin)",
  "growth:ratify": "reviewed a goal",
  "growth:ratify:super-admin": "reviewed a goal (platform admin)",
  "growth:goal-reviews": "read the reviews on your goals",
  "growth:goal-reviews:super-admin": "read the reviews on your goals (platform admin)",
  offered: "was given access by you",
};

function describeSurface(surface: string | null): string {
  if (!surface) return "looked";
  return SURFACE_LABEL[surface] ?? `looked (${surface})`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

/**
 * Who has looked (Goals offering, Phase 5). Every read behind the goals grant
 * writes an access-log row; this is that log, newest first, in the subject's
 * own words. A reader we cannot name is shown by id, never hidden — a log
 * that omits the reads it cannot label is not a log.
 */
function WhoHasLooked({ nameById }: { nameById: Map<string, string> }) {
  const log = useAccessLog();
  const rows = (log.data ?? []).slice(0, 50);
  return (
    <section aria-labelledby="looked-heading" className="flex flex-col gap-2" data-testid="who-has-looked">
      <h2 id="looked-heading" className="text-[13px] font-bold uppercase tracking-wide text-[#7C93B5]">
        Who has looked
      </h2>
      <Card className="!p-5">
        {log.isLoading && (
          <p className="text-[13.5px] text-[#13294B]/70">Reading the access log…</p>
        )}
        {log.isError && (
          <p className="text-[13.5px] text-[#13294B]/80" data-testid="who-has-looked-error">
            We couldn&apos;t read the access log just now. It is not empty — it is unread.
          </p>
        )}
        {!log.isLoading && !log.isError && rows.length === 0 && (
          <p className="text-[13.5px] text-[#13294B]/70" data-testid="who-has-looked-empty">
            Nobody has looked at your goals yet. Every read is recorded here, including reads by
            platform administrators.
          </p>
        )}
        {rows.length > 0 && (
          <ul className="flex flex-col divide-y divide-[#F1ECE2]" aria-label="Access log">
            {rows.map((r: AccessLogRow, i) => (
              <li key={`${r.viewer_user_id}-${r.viewed_at ?? i}`} className="flex flex-wrap items-center gap-2 py-2 text-[13px] text-[#13294B]">
                <Eye className="h-3.5 w-3.5 text-[#7C93B5]" aria-hidden />
                <b className="text-[#0B1B33]">{nameById.get(r.viewer_user_id) ?? `Someone (${r.viewer_user_id.slice(0, 8)}…)`}</b>
                <span>{describeSurface(r.surface)}</span>
                <span className="ml-auto text-[11.5px] text-[#7C93B5]">{formatWhen(r.viewed_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

/** Add a person by exact email: find one, then share. Never a search. */
function AddPerson() {
  const lookup = useLookupPerson();
  const offer = useOfferAccess();
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<LookupResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const find = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFound(null);
    try {
      setFound(await lookup.mutateAsync(email));
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setMessage(status === 404 ? "No account with that email." : errorText(err));
    }
  };

  const share = async () => {
    if (!found) return;
    setMessage(null);
    try {
      await offer.mutateAsync({ granteeUserId: found.userId, categories: GOALS_ONLY });
      setMessage(`Shared with ${found.displayName || found.email}.`);
      setFound(null);
      setEmail("");
    } catch (err) {
      setMessage(errorText(err));
    }
  };

  return (
    <Card className="!p-[19px]">
      <div className="flex items-center gap-2 text-[15px] font-bold text-[#0B1B33]">
        <UserPlus className="h-4 w-4 text-[#127A8A]" aria-hidden /> Add a person
      </div>
      <p className="mt-1 text-[13px] text-[#13294B]/75">
        Someone with an IG account who isn&apos;t listed above — a coach outside your
        organisation, for instance. Their exact email address; no lookup by name.
      </p>
      <form onSubmit={find} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          aria-label="Email address"
          className="h-9 flex-1"
        />
        <Button type="submit" size="sm" className="h-9" variant="outline" disabled={lookup.isPending || !email.includes("@")}>
          {lookup.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : <Search className="mr-1 h-3.5 w-3.5" aria-hidden />}
          Find
        </Button>
      </form>
      {found && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#FBF7F0] px-3 py-2.5">
          <Mail className="h-4 w-4 text-[#7C93B5]" aria-hidden />
          <span className="text-[13.5px] font-semibold text-[#0B1B33]">{found.displayName || found.email}</span>
          {found.email && <span className="text-[12px] text-[#13294B]/70">{found.email}</span>}
          <Button type="button" size="sm" className="ml-auto" disabled={offer.isPending} onClick={share}>
            {offer.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Share my goals
          </Button>
        </div>
      )}
      {message && (
        <p role={message.startsWith("Shared") ? "status" : "alert"} className={message.startsWith("Shared") ? "mt-2 text-[12.5px] text-[#5B8A72]" : "mt-2 text-[12.5px] text-[#C2614F]"}>
          {message}
        </p>
      )}
    </Card>
  );
}

export default function SummitSharing() {
  const people = usePeople();
  const grants = useMyGrants();
  const mine = useMyGoals();

  const loading = people.isLoading || grants.isLoading;
  const failed = people.isError || grants.isError;
  const list = people.data?.people ?? [];
  const nameById = new Map(list.map((p) => [p.userId, p.displayName || p.email || "Someone"]));
  const requests = (grants.data ?? []).filter((r) => r.status === "pending");
  const unavailable = Object.entries(people.data?.sources ?? {})
    .filter(([, state]) => state === "unavailable")
    .map(([name]) => SOURCE_LABEL[name] ?? name);
  const preview = (mine.data?.goals ?? []).find((g) => g.visibility === "shareable");

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Your choice, person by person"
        title="Who can see my goals"
        sub="Nobody sees your goals by rank. You share them with a specific person for a year, can renew, and can take it back at any time. A goal you mark private stays hidden even from them."
      />

      {loading && (
        <div className="flex items-center gap-2 text-[13.5px] text-[#13294B]/70" data-testid="sharing-loading">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Reading who you can share with…
        </div>
      )}

      {!loading && failed && (
        <Card className="!p-5" testId="sharing-error">
          <p className="text-[14px] text-[#13294B]/80">
            We couldn&apos;t read your sharing settings just now. Nothing has changed —
            refresh to try again.
          </p>
        </Card>
      )}

      {!loading && !failed && unavailable.length > 0 && (
        <Callout tone="info" icon={<ShieldAlert className="h-4 w-4 text-[#A9720F]" />}>
          We couldn&apos;t read {unavailable.join(" or ")} just now, so that part of this list may be
          missing. It is not empty — it is unread.
        </Callout>
      )}

      {!loading && !failed && requests.length > 0 && (
        <Card className="!p-[19px]" testId="sharing-requests">
          <div className="text-[15px] font-bold text-[#0B1B33]">Waiting on you</div>
          <ul className="mt-2">
            {requests.map((r) => (
              <RequestRow key={r.id} row={r} name={nameById.get(r.grantee_user_id) ?? "Someone"} />
            ))}
          </ul>
        </Card>
      )}

      {!loading && !failed && list.length === 0 && (
        <Card className="!p-5" testId="sharing-empty">
          <div className="text-[15px] font-bold text-[#0B1B33]">No one to share with yet</div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#13294B]/80">
            When a manager or coach is linked to you they appear here. You can also add
            someone by their email address below.
          </p>
        </Card>
      )}

      {!loading && !failed && list.length > 0 && (
        <Card className="!p-[19px]" testId="sharing-people">
          <div className="text-[15px] font-bold text-[#0B1B33]">People</div>
          <ul className="mt-1">
            {list.map((p) => (
              <PersonRow key={p.userId} person={p} />
            ))}
          </ul>
        </Card>
      )}

      {!loading && !failed && <AddPerson />}

      {!loading && !failed && <WhoHasLooked nameById={nameById} />}

      <section aria-labelledby="preview-heading" className="flex flex-col gap-2">
        <h2 id="preview-heading" className="text-[13px] font-bold uppercase tracking-wide text-[#7C93B5]">
          What they see
        </h2>
        {preview ? (
          <div data-testid="sharing-preview">
            <CoachGoalCard goal={preview} onRatify={() => undefined} ratifying={false} />
          </div>
        ) : (
          <Card className="!p-5">
            <p className="text-[13.5px] text-[#13294B]/80">
              Publish a goal and it will show here exactly as a person you share with sees it.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
