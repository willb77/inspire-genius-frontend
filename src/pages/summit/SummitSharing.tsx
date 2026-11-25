/**
 * Sharing — who can see my goals and my PRISM profile (Goals offering,
 * Phase 3; PRISM added by TDS-1c).
 *
 * Goals and the PRISM profile are private until the person shares them with a
 * specific someone, for a fixed term they can see and renew, and can take back
 * at any time. Rank buys nobody a look (D6, D9). This page is the whole of
 * that decision:
 *
 *   - the people they could share with, each with one switch PER CATEGORY,
 *     the expiry and a Renew, and each naming the basis of its own claim
 *     (TDS-D3: the organisation's record of a reporting line and a manager's
 *     own roster entry are not the same thing and must not read alike).
 *     The backend keeps ONE live consent row per
 *     (member, person) and an offer REPLACES that row's category set, so a
 *     switch sends the union of what is live and what was toggled — never a
 *     single category on its own, which would silently strip the other;
 *   - requests waiting on them, naming what was asked, with the requester's
 *     stated reason. Approving sends NO categories: the backend then stores
 *     exactly what was asked. Before TDS-1c every request was approved as
 *     goals, whatever it asked for, and a manager's PRISM request was answered
 *     with a grant that could not satisfy it;
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
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Eye, Loader2, Mail, RefreshCw, Search, ShieldAlert, UserPlus } from "lucide-react";
import { PageHead, Card, Callout } from "@/pages/summit/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CoachGoalCard } from "@/components/manager/development/tabs/GoalsPanel";
import { useMyGoals } from "@/hooks/summit/useMyGoals";
import { isHouseStyleOn } from "@/lib/house/areaSwitch";
import { MemberLinkRequestCard } from "@/components/sharing/MemberLinkRequestCard";
import {
  useAccessLog,
  useCategoryDetails,
  useExtendGrant,
  useLookupPerson,
  useMyGrants,
  useOfferAccess,
  usePeople,
  useRespondToRequest,
  useRevokeGrant,
} from "@/hooks/consent/useVisibility";
import type {
  AccessLogRow,
  CategoryDetail,
  LookupResult,
  MyGrantRow,
  VisibilityCategories,
  VisibilityPerson,
} from "@/types/consent";
import { withPrism } from "@/lib/withPrism"

/**
 * Where each candidate's claim comes from, said in the member's words.
 *
 * The four kinds reach this list by four routes of very different authority,
 * and before TDS-D3 the panel rendered them as four interchangeable labels —
 * "Your manager" next to "Manager (roster)", which is the API's vocabulary and
 * tells a member nothing. The two that matter:
 *
 *   - `manager_of_record` is the ORGANISATION's record of the reporting line
 *     (`public.employee_profiles`);
 *   - `roster_manager` is a MANAGER'S OWN ASSERTION — anyone who adds this
 *     member to a roster they keep appears here, and nothing checks it.
 *
 * So each row states its basis. `because` describes only what the data
 * actually establishes: no verification is claimed for either, and neither is
 * flagged as suspect — the member is choosing who to share with, not being
 * warned about an intruder. A person can hold several kinds at once and every
 * one of them is shown, because holding one does not cancel another: a manager
 * of record who also keeps a roster is both, and hiding either would misstate
 * the record.
 *
 * An unrecognised kind falls back to a stated unknown rather than rendering
 * blank. `kinds.map((k) => LABEL[k]).join(" · ")` on an unknown key yields the
 * empty string, which is the failure this codebase keeps paying for — a row
 * with no basis at all, indistinguishable from one that was never meant to
 * have one.
 */
/**
 * The parameter is a plain string on purpose: `kinds` arrives from the API, so
 * a kind outside the union is a runtime possibility the type cannot exclude,
 * and typing it as `PersonKind` would make the fallback look dead.
 */
function basisOf(kind: string, t: TFunction): { label: string; because: string } {
  switch (kind) {
    case "manager_of_record":
      return {
        label: t("sharing.basis.managerOfRecord.label", { defaultValue: "Your manager" }),
        because: t("sharing.basis.managerOfRecord.because", { defaultValue: "Your organisation's records show you report to them." }),
      };
    case "roster_manager":
      return {
        label: t("sharing.basis.rosterManager.label", { defaultValue: "Lists you on their team" }),
        because: t("sharing.basis.rosterManager.because", { defaultValue: "They added you to a team list they keep here — their own list, not your organisation's records." }),
      };
    case "practitioner":
      return {
        label: t("sharing.basis.practitioner.label", { defaultValue: "Your coach" }),
        because: t("sharing.basis.practitioner.because", { defaultValue: "They added you as a client." }),
      };
    case "requester":
      return {
        label: t("sharing.basis.requester.label", { defaultValue: "Asked for access" }),
        because: t("sharing.basis.requester.because", { defaultValue: "They asked you to share with them." }),
      };
    default:
      return {
        label: t("sharing.basis.unknown.label", { defaultValue: "On your list" }),
        because: t("sharing.basis.unknown.because", { defaultValue: "We can't say how they came to be on this list." }),
      };
  }
}

function sourceLabel(name: string, t: TFunction): string {
  switch (name) {
    case "managers_of_record": return t("sharing.source.managersOfRecord", { defaultValue: "your manager of record" });
    case "roster_managers": return t("sharing.source.rosterManagers", { defaultValue: "managers who added you to their team list" });
    case "practitioners": return t("sharing.source.practitioners", { defaultValue: "your coach" });
    case "requesters": return t("sharing.source.requesters", { defaultValue: "requests" });
    default: return name;
  }
}

const GOALS_ONLY = { goals: true } as const;

/**
 * The categories a member can share from this page, in display order.
 *
 * What each one PROTECTS is not written here. SHARE-1: it comes from the server
 * (`GET /categories` → `details`), next to the readers that decide it, because
 * a hard-coded flag here went stale — by 2026-10-17 this list called PRISM
 * protected (it is partly) and interviews unprotected (they are). A switch that
 * looks like protection and is not would be worse than no switch (S-2 CSA,
 * S2-F1).
 */
type ShareCategory = "goals" | "prism" | "assessments" | "artefacts" | "interviews" | "development";
const SHARE_CATEGORIES: { key: ShareCategory }[] = [
  { key: "goals" },
  { key: "prism" },
  { key: "assessments" },
  { key: "artefacts" },
  { key: "interviews" },
  { key: "development" },
];

function shareLabel(key: ShareCategory, t: TFunction): string {
  switch (key) {
    case "goals": return t("sharing.cat.goals.label", { defaultValue: "Goals" });
    case "prism": return t("sharing.cat.prism.label", { defaultValue: "PRISM profile" });
    case "assessments": return t("sharing.cat.assessments.label", { defaultValue: "Assessments" });
    case "artefacts": return t("sharing.cat.artefacts.label", { defaultValue: "Profile" });
    case "interviews": return t("sharing.cat.interviews.label", { defaultValue: "Interviews" });
    case "development": return t("sharing.cat.development.label", { defaultValue: "Development" });
  }
}

function shareNoun(key: ShareCategory, t: TFunction): string {
  switch (key) {
    case "goals": return t("sharing.cat.goals.noun", { defaultValue: "goals" });
    case "prism": return t("sharing.cat.prism.noun", { defaultValue: "PRISM profile" });
    case "assessments": return t("sharing.cat.assessments.noun", { defaultValue: "assessments" });
    case "artefacts": return t("sharing.cat.artefacts.noun", { defaultValue: "profile documents" });
    case "interviews": return t("sharing.cat.interviews.noun", { defaultValue: "interview results" });
    case "development": return t("sharing.cat.development.noun", { defaultValue: "development plan" });
  }
}
const PAGE_KEYS = new Set<string>(SHARE_CATEGORIES.map((c) => c.key));

type Enforcement = Pick<CategoryDetail, "enforced" | "note">;

/**
 * What sharing `key` decides, from the server's details. When the details could
 * not be read, goals (enforced since the Goals offering) says so and every
 * other category reads "not protected yet": a fallback errs towards telling the
 * member less is protected, never more.
 */
function enforcementOf(details: CategoryDetail[] | undefined, key: ShareCategory): Enforcement {
  const row = details?.find((d) => d.key === key);
  if (row) return { enforced: row.enforced, note: row.note };
  return { enforced: key === "goals" ? "yes" : "no", note: "" };
}

/** The grant rows arrive with `categories` as an object or as a JSON string. */
function parseCategories(raw: VisibilityCategories | string | null | undefined): VisibilityCategories {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as VisibilityCategories) : {};
    } catch {
      return {};
    }
  }
  return raw;
}

/** "your goals", "your PRISM profile", "your goals and PRISM profile". */
function describeCategories(cats: VisibilityCategories, t: TFunction, possessive: "your" | "my" | "" = "your"): string {
  const named = SHARE_CATEGORIES.filter((c) => cats[c.key] === true).map((c) => shareNoun(c.key, t));
  const other = Object.entries(cats)
    .filter(([k, v]) => v === true && !SHARE_CATEGORIES.some((c) => c.key === k))
    .map(([k]) => k);
  const all = [...named, ...other];
  const list =
    all.length === 0
      ? shareNoun("goals", t)
      : all.length === 1
        ? all[0]
        : `${all.slice(0, -1).join(", ")}${t("sharing.and", { defaultValue: " and " })}${all[all.length - 1]}`;
  if (possessive === "my") return t("sharing.describe.my", { defaultValue: "my {{list}}", list });
  if (possessive === "your") return t("sharing.describe.your", { defaultValue: "your {{list}}", list });
  return list;
}

function errorText(err: unknown, t: TFunction): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return t("sharing.errorSave", { defaultValue: "That didn't save. Nothing was changed — try again." });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** What this person can see RIGHT NOW — nothing if the grant is missing, pending, revoked or expired. */
function liveCategories(p: VisibilityPerson): VisibilityCategories {
  const g = p.grant;
  if (!g || g.status !== "granted") return {};
  if (g.expiresAt && new Date(g.expiresAt).getTime() <= Date.now()) return {};
  return parseCategories(g.categories);
}

/** One person's access: name, relation, "Share all", one switch per category, the term, Renew. Lives in the "See Access" tile. */
function PersonAccess({ person, details }: { person: VisibilityPerson; details: CategoryDetail[] | undefined }) {
  const { t } = useTranslation("summitPages");
  const offer = useOfferAccess();
  const revoke = useRevokeGrant();
  const extend = useExtendGrant();
  const live = liveCategories(person);
  const sharedAny = SHARE_CATEGORIES.some((c) => live[c.key] === true);
  const pending = offer.isPending || revoke.isPending || extend.isPending;
  const error = offer.error ?? revoke.error ?? extend.error;
  const isPendingRequest = person.grant?.status === "pending";
  const who = person.displayName || person.email || t("sharing.thisPerson", { defaultValue: "this person" });

  // One row per person on the backend; an offer replaces its category set.
  // So the next set is computed from what is live, and only when nothing is
  // left does the row get revoked.
  const toggle = (key: ShareCategory, checked: boolean) => {
    const next: VisibilityCategories = { ...live, [key]: checked };
    const remaining = Object.entries(next).filter(([, v]) => v === true);
    if (remaining.length === 0) {
      if (person.grant) revoke.mutate(person.grant.id);
      return;
    }
    offer.mutate({ granteeUserId: person.userId, categories: Object.fromEntries(remaining) });
  };

  // SHARE-1 (b): every category on this page in ONE offer, or none of them.
  // Keys not on this page (engagement, topics) are kept exactly as they are —
  // "Share all" means all of what the member can see here, nothing more.
  const allOn = SHARE_CATEGORIES.every((c) => live[c.key] === true);
  const shareAll = (checked: boolean) => {
    const offPage = Object.fromEntries(
      Object.entries(live).filter(([k, v]) => v === true && !PAGE_KEYS.has(k)),
    );
    if (checked) {
      const pageAll = Object.fromEntries(SHARE_CATEGORIES.map((c) => [c.key, true]));
      offer.mutate({ granteeUserId: person.userId, categories: { ...offPage, ...pageAll } });
      return;
    }
    if (Object.keys(offPage).length === 0) {
      if (person.grant) revoke.mutate(person.grant.id);
      return;
    }
    offer.mutate({ granteeUserId: person.userId, categories: offPage });
  };
  const unprotected = SHARE_CATEGORIES.filter((c) => enforcementOf(details, c.key).enforced !== "yes");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-[#0B1B33]">
            {person.displayName || person.email || t("sharing.someone", { defaultValue: "Someone" })}
          </div>
          {person.email && (
            <div className="truncate text-[12px] text-[#13294B]/70">{person.email}</div>
          )}
          <ul className="mt-0.5 flex flex-col gap-0.5" data-testid={`basis-${person.userId}`}>
            {person.kinds.map((k) => {
              const basis = basisOf(k, t);
              return (
                <li key={k} className="text-[12px] leading-snug text-[#13294B]/70">
                  <span className="font-semibold text-[#13294B]/85">{basis.label}</span>
                  {" — "}
                  {basis.because}
                </li>
              );
            })}
          </ul>
        </div>
        {isPendingRequest ? (
          <span className="rounded-full bg-[#C88B1B]/15 px-2.5 py-1 text-[11.5px] font-semibold text-[#A9720F]">
            {t("sharing.waitingSee", { defaultValue: "Waiting on you — see requests below" })}
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-4" data-testid={`share-switches-${person.userId}`}>
            <label className="flex items-center gap-2 text-[12.5px] font-bold text-[#0B1B33]">
              <Switch
                checked={allOn}
                disabled={pending}
                aria-label={t("sharing.shareEverythingAria", { defaultValue: "Share everything on this page with {{who}}", who })}
                onCheckedChange={shareAll}
              />
              {t("sharing.shareAll", { defaultValue: "Share all" })}
            </label>
            {SHARE_CATEGORIES.map((c) => {
              const e = enforcementOf(details, c.key);
              return (
                <label key={c.key} className="flex items-center gap-2 text-[12.5px] font-semibold text-[#13294B]">
                  <Switch
                    checked={live[c.key] === true}
                    disabled={pending}
                    aria-label={t("sharing.shareCategoryAria", { defaultValue: "Share {{noun}} with {{who}}", noun: shareNoun(c.key, t), who })}
                    onCheckedChange={(checked) => toggle(c.key, checked)}
                  />
                  {shareLabel(c.key, t)}
                  {e.enforced === "partial" && (
                    <span className="text-[11px] font-normal text-[#A9720F]" data-testid={`partly-${c.key}`} title={e.note}>
                      {t("sharing.partlyProtected", { defaultValue: "(partly protected)" })}
                    </span>
                  )}
                  {e.enforced === "no" && (
                    <span className="text-[11px] font-normal text-[#A9720F]" data-testid={`not-enforced-${c.key}`}>
                      {t("sharing.notProtectedYet", { defaultValue: "(not protected yet)" })}
                    </span>
                  )}
                </label>
              );
            })}
            <span className="text-[12px] text-[#13294B]/70" data-testid={`share-state-${person.userId}`}>
              {sharedAny ? t("sharing.sharingWhat", { defaultValue: "Sharing {{what}}", what: describeCategories(live, t, "") }) : t("sharing.notShared", { defaultValue: "Not shared" })}
            </span>
            {unprotected.length > 0 && (
              <span className="basis-full text-[11.5px] text-[#13294B]/65" data-testid={`share-all-note-${person.userId}`}>
                {(unprotected.length === 1 ? t("sharing.shareAllIncludes_one", { count: unprotected.length, defaultValue: "“Share all” includes {{list}}, which is not fully protected yet.", list: unprotected.map((c) => shareLabel(c.key, t)).join(", ") }) : t("sharing.shareAllIncludes_other", { count: unprotected.length, defaultValue: "“Share all” includes {{list}}, which are not fully protected yet.", list: unprotected.map((c) => shareLabel(c.key, t)).join(", ") }))}
              </span>
            )}
          </div>
        )}
        {pending && <Loader2 className="h-4 w-4 animate-spin text-[#7C93B5]" aria-hidden />}
      </div>
      {sharedAny && person.grant && (
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#13294B]/75">
          <span>{t("sharing.until", { defaultValue: "Until {{date}}", date: formatDate(person.grant.expiresAt) })}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            disabled={pending}
            onClick={() => extend.mutate({ grantId: person.grant!.id, days: 365 })}
          >
            <RefreshCw className="mr-1 h-3 w-3" aria-hidden /> {t("sharing.renew", { defaultValue: "Renew for a year" })}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[12.5px] text-[#C2614F]">
          {errorText(error, t)}
        </p>
      )}
    </div>
  );
}

/** A request waiting on the person, with the reason the requester gave. */
function RequestRow({ row, name }: { row: MyGrantRow; name: string }) {
  const { t } = useTranslation("summitPages");
  const respond = useRespondToRequest();
  // What was asked, in the member's words. Approving sends no categories, so
  // the backend stores exactly this set — never a hard-coded one.
  const asked = describeCategories(parseCategories(row.categories), t);
  return (
    <li className="flex flex-col gap-2 border-b border-[#F1ECE2] py-3 last:border-b-0" data-testid={`request-${row.id}`}>
      <div className="text-[14px] font-bold text-[#0B1B33]">{name}</div>
      <p className="text-[13px] font-semibold text-[#13294B]">{t("sharing.wantsToSee", { defaultValue: "wants to see {{what}}.", what: asked })}</p>
      <p className="text-[13px] text-[#13294B]/80">
        {row.reason ? <>&ldquo;{row.reason}&rdquo;</> : <em>{t("sharing.noReason", { defaultValue: "No reason given." })}</em>}
        {row.requested_at ? <span className="text-[#13294B]/60"> {t("sharing.asked", { defaultValue: "· asked {{date}}", date: formatDate(row.requested_at) })}</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ grantId: row.id, approve: true })}
        >
          {t("sharing.shareWhat", { defaultValue: "Share {{what}}", what: describeCategories(parseCategories(row.categories), t, "my") })}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ grantId: row.id, approve: false })}
        >
          {t("sharing.decline", { defaultValue: "Decline" })}
        </Button>
        {respond.isPending && <Loader2 className="h-4 w-4 animate-spin text-[#7C93B5]" aria-hidden />}
      </div>
      {respond.error && (
        <p role="alert" className="text-[12.5px] text-[#C2614F]">
          {errorText(respond.error, t)}
        </p>
      )}
    </li>
  );
}

function surfaceLabel(surface: string, t: TFunction): string | undefined {
  switch (surface) {
    case "growth:goals": return t("sharing.surface.goals", { defaultValue: "read your goals" });
    case "growth:goals:super-admin": return t("sharing.surface.goalsAdmin", { defaultValue: "read your goals (platform admin)" });
    case "growth:dossier": return t("sharing.surface.dossier", { defaultValue: "opened your development dossier" });
    case "growth:dossier:super-admin": return t("sharing.surface.dossierAdmin", { defaultValue: "opened your development dossier (platform admin)" });
    case "growth:ratify": return t("sharing.surface.ratify", { defaultValue: "reviewed a goal" });
    case "growth:ratify:super-admin": return t("sharing.surface.ratifyAdmin", { defaultValue: "reviewed a goal (platform admin)" });
    case "growth:goal-reviews": return t("sharing.surface.goalReviews", { defaultValue: "read the reviews on your goals" });
    case "growth:goal-reviews:super-admin": return t("sharing.surface.goalReviewsAdmin", { defaultValue: "read the reviews on your goals (platform admin)" });
    case "offered": return t("sharing.surface.offered", { defaultValue: "was given access by you" });
    case "extended": return t("sharing.surface.extended", { defaultValue: "had access renewed by you" });
    default: return otherSurfaceLabel(surface, t);
  }
}

/**
 * The other read paths that write the log: Job Fit, development and profile
 * reads in growth-service. A platform administrator's read is the same code
 * with ":super-admin" on the end, so one label covers both.
 */
const ADMIN_SUFFIX = ":super-admin";
function otherSurfaceLabel(surface: string, t: TFunction): string | undefined {
  const admin = surface.endsWith(ADMIN_SUFFIX);
  const base = admin ? surface.slice(0, -ADMIN_SUFFIX.length) : surface;
  let label: string | undefined;
  switch (base) {
    case "growth:fit-matches": label = t("sharing.surface.fitMatches", { defaultValue: "read your Job Fit matches" }); break;
    case "growth:gaps": label = t("sharing.surface.gaps", { defaultValue: "read your gap analysis" }); break;
    case "growth:learning-items": label = t("sharing.surface.learningItems", { defaultValue: "read your learning items" }); break;
    case "growth:milestones": label = t("sharing.surface.milestones", { defaultValue: "read your milestones" }); break;
    case "growth:matches": label = t("sharing.surface.matches", { defaultValue: "read your development matches" }); break;
    case "growth:member-prism": label = t("sharing.surface.memberPrism", { defaultValue: "read your PRISM profile" }); break;
    case "growth:member-profile": label = t("sharing.surface.memberProfile", { defaultValue: "read your profile" }); break;
    case "growth:share": label = t("sharing.surface.share", { defaultValue: "read your shared goals" }); break;
    default: return undefined;
  }
  return admin ? t("sharing.surface.adminOf", { defaultValue: "{{what}} (platform admin)", what: label }) : label;
}

function describeSurface(surface: string | null, t: TFunction): string {
  if (!surface) return t("sharing.surface.looked", { defaultValue: "looked" });
  return surfaceLabel(surface, t) ?? t("sharing.surface.lookedAt", { defaultValue: "looked ({{surface}})", surface });
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

/**
 * Preview Activity (was "Who has looked", Goals offering Phase 5). Every read
 * behind the goals grant writes an access-log row; this renders rows of that
 * log, newest first, in the subject's own words. A reader we cannot name is
 * shown by id, never hidden — a log that omits the reads it cannot label is
 * not a log.
 */
function ActivityList({ rows, nameById }: { rows: AccessLogRow[]; nameById: Map<string, string> }) {
  const { t } = useTranslation("summitPages");
  return (
    <ul className="flex flex-col divide-y divide-[#F1ECE2]" aria-label={t("sharing.accessLog", { defaultValue: "Access log" })}>
      {rows.map((r, i) => (
        <li key={`${r.viewer_user_id}-${r.viewed_at ?? i}`} className="flex flex-wrap items-center gap-2 py-2 text-[13px] text-[#13294B]">
          <Eye className="h-3.5 w-3.5 text-[#7C93B5]" aria-hidden />
          <b className="text-[#0B1B33]">{nameById.get(r.viewer_user_id) ?? t("sharing.someoneId", { defaultValue: "Someone ({{id}}…)", id: r.viewer_user_id.slice(0, 8) })}</b>
          <span>{describeSurface(r.surface, t)}</span>
          <span className="ml-auto text-[11.5px] text-[#7C93B5]">{formatWhen(r.viewed_at)}</span>
        </li>
      ))}
    </ul>
  );
}

/** The "Preview Activity" pill inside a person's tile: what THIS person has looked at. */
function PersonActivity({ person, nameById }: { person: VisibilityPerson; nameById: Map<string, string> }) {
  const { t } = useTranslation("summitPages");
  const log = useAccessLog();
  const [open, setOpen] = useState(false);
  const panelId = `activity-${person.userId}`;
  const rows = (log.data ?? []).filter((r) => r.viewer_user_id === person.userId).slice(0, 50);
  return (
    <div className="flex flex-col gap-2" data-testid={`person-activity-${person.userId}`}>
      <div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#127A8A]/40 bg-white px-3 py-1.5 text-[12.5px] font-bold text-[#0B1B33] hover:bg-[#FBF7F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#127A8A]"
        >
          <Eye className="h-3.5 w-3.5 text-[#127A8A]" aria-hidden />
          {t("sharing.previewActivity", { defaultValue: "Preview Activity" })}
        </button>
      </div>
      <div id={panelId} hidden={!open}>
        {log.isLoading && (
          <p className="text-[13px] text-[#13294B]/70">{t("sharing.readingLog", { defaultValue: "Reading the access log…" })}</p>
        )}
        {log.isError && (
          <p className="text-[13px] text-[#13294B]/80" data-testid="person-activity-error">
            {t("sharing.logError", { defaultValue: "We couldn't read the access log just now. It is not empty — it is unread." })}
          </p>
        )}
        {!log.isLoading && !log.isError && rows.length === 0 && (
          <p className="text-[13px] text-[#13294B]/70" data-testid="person-activity-empty">
            {t("sharing.personLogEmpty", { defaultValue: "This person hasn't looked at your goals yet. Every read is recorded, including reads by platform administrators." })}
          </p>
        )}
        {rows.length > 0 && <ActivityList rows={rows} nameById={nameById} />}
      </div>
    </div>
  );
}

/**
 * Reads by someone who is NOT on the list (a platform administrator, or a
 * person whose access has since been removed). The per-person Preview Activity
 * cannot show these, and the log's promise is that every read is recorded, so
 * they get a tile of their own: a card in the people grid, with the same
 * Preview Activity pill, opening the same kind of tile. Renders nothing when
 * there are none.
 */
function OtherReaders({ listedIds, nameById }: { listedIds: Set<string>; nameById: Map<string, string> }) {
  const { t } = useTranslation("summitPages");
  const log = useAccessLog();
  const [open, setOpen] = useState(false);
  const rows = (log.data ?? []).filter((r) => !listedIds.has(r.viewer_user_id)).slice(0, 50);
  if (log.isLoading || log.isError || rows.length === 0) return null;
  const title = t("sharing.otherReaders", { defaultValue: "Reads by people not listed above" });
  const body = t("sharing.otherReadersBody", { defaultValue: "Platform administrators, or people whose access has been removed." });
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[#F1ECE2] bg-white p-3.5" data-testid="other-readers">
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-[#0B1B33]">{title}</div>
        <div className="text-[12px] text-[#13294B]/70">{body}</div>
      </div>
      <div className="mt-auto">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-full"
          onClick={() => setOpen(true)}
        >
          <Eye className="h-3.5 w-3.5 text-[#127A8A]" aria-hidden />
          {t("sharing.previewActivity", { defaultValue: "Preview Activity" })}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" data-testid="other-readers-tile">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{body}</DialogDescription>
          </DialogHeader>
          <ActivityList rows={rows} nameById={nameById} />
        </DialogContent>
      </Dialog>
    </li>
  );
}

/** One person as a card: who, how much is shared, and the "See Access" pill that opens their tile. */
function PersonCard({ person, details, nameById }: { person: VisibilityPerson; details: CategoryDetail[] | undefined; nameById: Map<string, string> }) {
  const { t } = useTranslation("summitPages");
  const [open, setOpen] = useState(false);
  const live = liveCategories(person);
  const sharedAny = SHARE_CATEGORIES.some((c) => live[c.key] === true);
  const name = person.displayName || person.email || t("sharing.someone", { defaultValue: "Someone" });
  const status = person.grant?.status === "pending"
    ? t("sharing.waitingSee", { defaultValue: "Waiting on you — see requests below" })
    : sharedAny
      ? t("sharing.sharingWhat", { defaultValue: "Sharing {{what}}", what: describeCategories(live, t, "") })
      : t("sharing.notShared", { defaultValue: "Not shared" });
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[#F1ECE2] bg-white p-3.5" data-testid={`person-card-${person.userId}`}>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-bold text-[#0B1B33]">{name}</div>
        {person.email && <div className="truncate text-[12px] text-[#13294B]/70">{person.email}</div>}
      </div>
      <div className="text-[12px] text-[#13294B]/75" data-testid={`card-status-${person.userId}`}>{status}</div>
      <div className="mt-auto">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-full"
          aria-label={t("sharing.seeAccessAria", { defaultValue: "See access for {{who}}", who: name })}
          onClick={() => setOpen(true)}
        >
          {t("sharing.seeAccess", { defaultValue: "See Access" })}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" data-testid={`access-tile-${person.userId}`}>
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>
              {t("sharing.tileBody", { defaultValue: "Choose what this person can see, how long, and who has looked." })}
            </DialogDescription>
          </DialogHeader>
          <PersonAccess person={person} details={details} />
          <PersonActivity person={person} nameById={nameById} />
        </DialogContent>
      </Dialog>
    </li>
  );
}

/** Add a person by exact email: find one, then share. Never a search. */
function AddPerson() {
  const { t } = useTranslation("summitPages");
  const lookup = useLookupPerson();
  const offer = useOfferAccess();
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<LookupResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Which kind of message this is. Decided here, not by reading the (translated) text.
  const [messageOk, setMessageOk] = useState(false);

  const find = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setMessageOk(false);
    setFound(null);
    try {
      setFound(await lookup.mutateAsync(email));
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setMessage(status === 404 ? t("sharing.noAccount", { defaultValue: "No account with that email." }) : errorText(err, t));
    }
  };

  const share = async () => {
    if (!found) return;
    setMessage(null);
    setMessageOk(false);
    try {
      await offer.mutateAsync({ granteeUserId: found.userId, categories: GOALS_ONLY });
      setMessage(t("sharing.sharedWith", { defaultValue: "Shared with {{name}}.", name: found.displayName || found.email }));
      setMessageOk(true);
      setFound(null);
      setEmail("");
    } catch (err) {
      setMessage(errorText(err, t));
    }
  };

  return (
    <Card className="!p-[19px]">
      <div className="flex items-center gap-2 text-[15px] font-bold text-[#0B1B33]">
        <UserPlus className="h-4 w-4 text-[#127A8A]" aria-hidden /> {t("sharing.addPerson", { defaultValue: "Add Access to a Person" })}
      </div>
      <p className="mt-1 text-[13px] text-[#13294B]/75">
        {t("sharing.addPersonBody", { defaultValue: "Someone with an IG account who isn't listed above. Their exact email address; no lookup by name. Your coach doesn't need one: once they've added you as a client they appear in the list above, and you share with them there." })}
      </p>
      <form onSubmit={find} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          aria-label={t("sharing.emailAria", { defaultValue: "Email address" })}
          className="h-9 flex-1"
        />
        <Button type="submit" size="sm" className="h-9" variant="outline" disabled={lookup.isPending || !email.includes("@")}>
          {lookup.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : <Search className="mr-1 h-3.5 w-3.5" aria-hidden />}
          {t("sharing.find", { defaultValue: "Find" })}
        </Button>
      </form>
      {found && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#FBF7F0] px-3 py-2.5">
          <Mail className="h-4 w-4 text-[#7C93B5]" aria-hidden />
          <span className="text-[13.5px] font-semibold text-[#0B1B33]">{found.displayName || found.email}</span>
          {found.email && <span className="text-[12px] text-[#13294B]/70">{found.email}</span>}
          <Button type="button" size="sm" className="ml-auto" disabled={offer.isPending} onClick={share}>
            {offer.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {t("sharing.shareMyGoals", { defaultValue: "Share my goals" })}
          </Button>
        </div>
      )}
      {message && (
        <p role={messageOk ? "status" : "alert"} className={messageOk ? "mt-2 text-[12.5px] text-[#5B8A72]" : "mt-2 text-[12.5px] text-[#C2614F]"}>
          {message}
        </p>
      )}
    </Card>
  );
}

/** The honest summary over the switches: what is not (fully) protected yet. */
function EnforcementNote({ details }: { details: CategoryDetail[] | undefined }) {
  const { t } = useTranslation("summitPages");
  const none = SHARE_CATEGORIES.filter((c) => enforcementOf(details, c.key).enforced === "no");
  const partly = SHARE_CATEGORIES.filter((c) => enforcementOf(details, c.key).enforced === "partial");
  if (none.length === 0 && partly.length === 0) return null;
  return (
    <div className="mt-1 flex flex-col gap-1 text-[12.5px] leading-relaxed text-[#13294B]/75" data-testid="not-enforced-note">
      {none.length > 0 && (
        <p>
          {t("sharing.notProtectedNote", { defaultValue: "Not protected yet — {{list}}: people on your reporting line can see these whether or not you share them. Your choice is saved and takes effect when protection for them launches.", list: none.map((c) => shareLabel(c.key, t)).join(", ") })}
        </p>
      )}
      {partly.map((c) => (
        <p key={c.key} data-testid={`partly-note-${c.key}`}>
          {t("sharing.partlyNote", { defaultValue: "{{label}}, partly protected: {{note}}", label: shareLabel(c.key, t), note: enforcementOf(details, c.key).note })}
        </p>
      ))}
    </div>
  );
}

/**
 * The sharing panel itself — requests, people, add a person, who has looked.
 * SHARE-1 (a): rendered by this page AND by Settings → Privacy, so the two
 * cannot drift. The page adds its heading and the "what they see" preview.
 */
export function SharingCore() {
  const { t } = useTranslation("summitPages");
  const people = usePeople();
  const grants = useMyGrants();
  const categories = useCategoryDetails();
  const details = categories.data?.details;

  const loading = people.isLoading || grants.isLoading;
  const failed = people.isError || grants.isError;
  const list = people.data?.people ?? [];
  const listedIds = new Set(list.map((p) => p.userId));
  const nameById = new Map(list.map((p) => [p.userId, p.displayName || p.email || t("sharing.someone", { defaultValue: "Someone" })]));
  const requests = (grants.data ?? []).filter((r) => r.status === "pending");
  const unavailable = Object.entries(people.data?.sources ?? {})
    .filter(([, state]) => state === "unavailable")
    .map(([name]) => sourceLabel(name, t));

  return (
    <div className="flex flex-col gap-[18px]">
      {loading && (
        <div className="flex items-center gap-2 text-[13.5px] text-[#13294B]/70" data-testid="sharing-loading">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("sharing.loading", { defaultValue: "Reading who you can share with…" })}
        </div>
      )}

      {!loading && failed && (
        <Card className="!p-5" testId="sharing-error">
          <p className="text-[14px] text-[#13294B]/80">
            {t("sharing.error", { defaultValue: "We couldn't read your sharing settings just now. Nothing has changed — refresh to try again." })}
          </p>
        </Card>
      )}

      {!loading && !failed && unavailable.length > 0 && (
        <Callout tone="info" icon={<ShieldAlert className="h-4 w-4 text-[#A9720F]" />}>
          {t("sharing.unavailable", { defaultValue: "We couldn't read {{sources}} just now, so that part of this list may be missing. It is not empty — it is unread.", sources: unavailable.join(t("sharing.or", { defaultValue: " or " })) })}
        </Callout>
      )}

      {!loading && !failed && requests.length > 0 && (
        <Card className="!p-[19px]" testId="sharing-requests">
          <div className="text-[15px] font-bold text-[#0B1B33]">{t("sharing.waitingHeading", { defaultValue: "Waiting on you" })}</div>
          <ul className="mt-2">
            {requests.map((r) => (
              <RequestRow key={r.id} row={r} name={nameById.get(r.grantee_user_id) ?? t("sharing.someone", { defaultValue: "Someone" })} />
            ))}
          </ul>
        </Card>
      )}

      {!loading && !failed && list.length === 0 && (
        <Card className="!p-5" testId="sharing-empty">
          <div className="text-[15px] font-bold text-[#0B1B33]">{t("sharing.emptyHeading", { defaultValue: "No one to share with yet" })}</div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#13294B]/80">
            {t("sharing.emptyBody", { defaultValue: "When a manager or coach is linked to you they appear here, with a switch for each part of your record. You can also add someone by their email address below." })}
          </p>
        </Card>
      )}

      {!loading && !failed && list.length > 0 && (
        <Card className="!p-[19px]" testId="sharing-people">
          <div className="text-[15px] font-bold text-[#0B1B33]">{t("sharing.people", { defaultValue: "People" })}</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#13294B]/75" data-testid="basis-note">
            {t("sharing.basisNote", { defaultValue: "Under each name is how they came to be on this list." })}
          </p>
          <EnforcementNote details={details} />
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="people-grid">
            {list.map((p) => (
              <PersonCard key={p.userId} person={p} details={details} nameById={nameById} />
            ))}
            <OtherReaders listedIds={listedIds} nameById={nameById} />
          </ul>
        </Card>
      )}

      {!loading && !failed && <AddPerson />}

      {!loading && !failed && <MemberLinkRequestCard />}

      {!loading && !failed && list.length === 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="other-readers-grid">
          <OtherReaders listedIds={listedIds} nameById={nameById} />
        </ul>
      )}
    </div>
  );
}

export default function SummitSharing() {
  const { t } = useTranslation("summitPages");
  const mine = useMyGoals();
  const preview = (mine.data?.goals ?? []).find((g) => g.visibility === "shareable");
  // House style (goals, S2a), display only: the preview is a picture of the
  // other person's card, so nothing on it may look clickable. The disabled
  // fieldset turns its one control (Co-ratify, which did nothing here) off and
  // the class hides it. OFF: the preview renders as today.
  const house = isHouseStyleOn("goals");

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow={t("sharing.eyebrow", { defaultValue: "Your choice, person by person" })}
        title={withPrism(t("sharing.title", { defaultValue: "Who can see my goals and PRISM profile" }))}
        sub={withPrism(t("sharing.sub", { defaultValue: "Nobody sees your goals or your PRISM profile by rank. You share each with a specific person for a year, can renew, and can take it back at any time. Turning a switch on renews the term for a year. A goal you mark private stays hidden even from them." }))}
      />

      <SharingCore />

      <section aria-labelledby="preview-heading" className="flex flex-col gap-2">
        <h2 id="preview-heading" className="text-[13px] font-bold uppercase tracking-wide text-[#7C93B5]">
          {t("sharing.whatTheySee", { defaultValue: "What they see" })}
        </h2>
        {preview && house ? (
          <div data-testid="sharing-preview">
            <p className="mb-2 text-[12.5px] text-[#13294B]/75" data-testid="sharing-preview-note">
              {t("sharing.previewNote", { defaultValue: "A preview of their view. Nothing on it can be clicked here." })}
            </p>
            <fieldset
              disabled
              aria-label={t("sharing.previewAria", { defaultValue: "Preview of what they see" })}
              className="m-0 min-w-0 border-0 p-0 [&_button]:hidden"
            >
              <CoachGoalCard goal={preview} onRatify={() => undefined} ratifying={false} />
            </fieldset>
          </div>
        ) : preview ? (
          <div data-testid="sharing-preview">
            <CoachGoalCard goal={preview} onRatify={() => undefined} ratifying={false} />
          </div>
        ) : (
          <Card className="!p-5">
            <p className="text-[13.5px] text-[#13294B]/80">
              {t("sharing.previewEmpty", { defaultValue: "Publish a goal and it will show here exactly as a person you share with sees it." })}
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
