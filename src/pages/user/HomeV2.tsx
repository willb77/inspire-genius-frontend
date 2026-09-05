import { useMemo, useState, useCallback} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  format,
  formatDistanceToNow,
  isSameDay,
  startOfDay,
  subDays,
} from "date-fns";
import {
  CalendarDays,
  MessageSquare,
  Sparkles,
  Target,
  UserRoundSearch,
} from "lucide-react";
import UserLayout from "@/layouts/UserLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import { useEnabledVerticals } from "@/verticals/core";
import { isVerticalForceDisabled } from "@/components/layout/useVerticalLauncher";
import { WORKSPACE_ITEM_UNAVAILABLE_REASON } from "@/constants/navigation";
import type { AxiosError } from "axios";
import { useLatestPrism } from "@/hooks/documents/useLatestPrism";
import { useMyProfile } from "@/hooks/profile/useProfile";
import {
  WelcomeBackTile,
  type WelcomeBackLastAction,
  type WelcomeBackPersonalInfo,
  type WelcomeBackQuickAction,
} from "@/components/dashboard/v2/WelcomeBackTile";
import {
  AddPersonalDocModal,
  type AddPersonalDocTarget,
} from "@/components/dashboard/v2/AddPersonalDocModal";
import { PrismDataMenu } from "@/components/dashboard/v2/PrismDataMenu";
import { ReplacePrismDataDialog } from "@/components/prism/ReplacePrismDataButton";
import { useAgentConversation } from "@/hooks/agents/useAgentConversation";
import type { DashboardVideo } from "@/components/dashboard/v2/WatchVideoCard";

/**
 * HomeV2 — the user dashboard (ig-surfaces/user-dashboard), and since
 * 2026-08-01 the DEFAULT surface at /home. The original Home is untouched and
 * stays reachable at /home/classic; see `isNewHomeEnabled` in
 * `@/lib/surfaceFlags` for how the default is resolved.
 *
 * Data comes from existing hooks only. PRISM status is sourced from
 * GET /v1/documents/latest-prism; Personal Info done-states from GET /me
 * `personal_docs`; the last-visit list from the same conversation query the
 * chat History dropdown uses.
 *
 * The "Other Assessments" group (DISC/MBTI/Clifton/Hogan/Big Five, driven by
 * GET /v1/profile/me/loaded-frameworks) was removed on 2026-08-05 on request,
 * along with its now-unreachable Add-assessment modal. Those results can still
 * be added from the Documents surface — the Home shortcut went, not the
 * capability.
 *
 * Layout (2026-08-06) — a header and a single tile:
 *   1. Header — "Welcome {first} — What are we working on today?" on one line,
 *      with three primary actions beneath it: Chat with Meridian (left),
 *      View PRISM Report (centre, only when a report exists), Request PRISM
 *      Survey (right). All three moved up out of the tile.
 *   2. WelcomeBackTile — the last four recent topics (each deep-links into the
 *      chat), the behavioral row with "Latest report" beside "Powered by
 *      PRISM", then the quick-action row (Self-Portrait / Prep Me /
 *      Goals(off) / Videos) with Personal Info pinned to its end.
 *
 * Removed along the way, each on request: the MeridianEngageCard that used to
 * lead the page (2026-08-05), the embedded Moments tile, and the
 * My Journey / Job Fit quick actions (2026-08-06). Every destination is still
 * reachable — Meridian and Goals from the sidebar, Moments from its own page
 * and the chat header, Direction Setting from its sub-nav.
 *
 * The Watch-a-Video and Recent-Activity tiles were removed; the videos survive
 * inside the quick-action row's Videos dropdown, so nothing became unreachable.
 *
 * 2026-08-03 changes:
 *   - The completion gauge ("Complete profile N%") was removed. The two
 *     dropdowns still show "n of m" per group, so completeness is still
 *     legible without a headline percentage.
 *   - The standalone QuickDirectionCard was removed and Direction Setting is
 *     now reached from the "My Journey" quick action, which sits between
 *     Prep Me and Job Fit. Same destination, in the row people scan.
 *   - Uploaded profile material is listed under the PRISM line and opens in a
 *     viewer modal, as does "View PRISM Report" — previously that button
 *     navigated to the assessment page and never showed the report.
 */

const VIDEOS: DashboardVideo[] = [
  {
    id: "prism-survey",
    title: "PRISM Survey — Introduction",
    src: "https://dj7od5nj42063.cloudfront.net/demo/PRISM_Survey_Intro.mp4",
  },
  {
    id: "neuroscience",
    title: "The Neuroscience of Behavior",
    src: "https://ig-demo-public-videos.s3.amazonaws.com/IG_Neuroscience_of_Behavior_Narrated.mp4",
  },
  {
    id: "brainmap-quiz",
    title: "Brain-Map Quiz",
    src: "https://ig-demo-public-videos.s3.amazonaws.com/IG-BrainMap_quiz.mp4",
  },
  {
    id: "journey-map",
    title: "Journey Map Demo",
    src: "https://ig-demo-public-videos.s3.amazonaws.com/Journey_Map_Demos.mp4",
  },
  {
    id: "people-transition",
    title: "People in Transition",
    src: "https://dj7od5nj42063.cloudfront.net/demo/People_in_Transition.mp4",
  },
];

// Quick-action links under the completion gauge. Each belongs to an
// entitlement-gated vertical, so each is resolved against the user's
// enabled_verticals before it renders as a live link.
const QUICK_ACTIONS: {
  key: string;
  labelKey: string;
  defaultLabel: string;
  to: string;
  /** The entitlement that gates USE. `null` = base product, never locked. */
  vertical: string | null;
  icon: WelcomeBackQuickAction["icon"];
}[] = [
  {
    key: "self-portrait",
    labelKey: "homeV2.quickSelfPortrait",
    defaultLabel: "Self-Portrait",
    to: ROUTES.LUMEN.SELF_PORTRAIT,
    vertical: "lumen",
    icon: UserRoundSearch,
  },
  {
    key: "moments",
    labelKey: "homeV2.quickTodaysPrep",
    defaultLabel: "Prep Me",
    to: ROUTES.LUMEN.MOMENTS,
    vertical: "lumen",
    icon: Sparkles,
  },
  // Goals — added to the row on 2026-08-06 switched off, live from 2026-08-11.
  // Renders only for a user entitled to `direction-setting`, like every other
  // pill here.
  {
    key: "goals",
    labelKey: "homeV2.quickGoals",
    defaultLabel: "Goals Studio",
    // Goals offering, Phase 3 (D8): the pill points at the person's own goals
    // surface and is gated on nothing. It used to point at the Direction
    // Setting stage page behind that vertical's entitlement, so a user without
    // it had no way to their goals from Home.
    to: ROUTES.MY_GOALS.BASE,
    vertical: null,
    icon: Target,
  },
];

/**
 * Quick actions switched off for everyone.
 *
 * Distinct from `isVerticalForceDisabled`, which turns off a whole vertical
 * everywhere it appears: this lever withholds one Home shortcut while leaving
 * the vertical itself live.
 *
 * **Empty as of 2026-08-11** (user request: users get real access to
 * Self-Portrait, Moments, Goals and Job Fit). Goals was the last member —
 * locked 2026-08-06 — and every remaining pill is now decided by entitlement
 * alone. Kept rather than deleted: it is the only per-pill lever, and it is
 * checked alongside `isVerticalForceDisabled` in the render below.
 *
 * Note this does NOT restore the My Journey / Job Fit pills. Those were removed
 * from `QUICK_ACTIONS` outright on 2026-08-06 rather than greyed, which was a
 * separate decision about the Home row — Job Fit is reachable from the My
 * Workspace menu, which is where it was switched back on.
 */
const LOCKED_QUICK_ACTIONS = new Set<string>([]);

/**
 * How far back the "what you worked on" dropdown reaches, in days.
 *
 * Replaced a flat top-3 on 2026-08-05. A count showed three items whether they
 * were from this morning or last spring; a window answers the question the
 * heading actually asks — what was I recently working on — and returns nothing
 * when the answer is genuinely "nothing recently".
 */
const LAST_ACTION_DAYS = 5;

/**
 * How many topics the tile lists.
 *
 * Four, by request (2026-08-06), and now a real cap rather than a safety net:
 * the topics render inline instead of behind a dropdown, so this is what keeps
 * the tile a fixed height. The {@link LAST_ACTION_DAYS} window still applies
 * first — four recent topics, not the four most recent whenever they happened.
 */
const LAST_ACTION_MAX = 4;

/** The Meridian agent id — the conversation list is per-agent. */
const AGENT_ID = "meridian";

type ConversationRow = {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
};

type ConversationListResponse = {
  data?: { conversations?: ConversationRow[] };
};

/** "2 days ago", or "" when the timestamp is missing/unparseable. */
function formatRelative(input?: string): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Day bucket for the recent-topics dropdown: "Today", "Yesterday", or a short
 * date. Compared on calendar day, not elapsed hours — 23:50 last night is
 * "Yesterday" to a person even though it is under a day ago.
 */
function dayBucket(input: string | undefined, now: Date): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, subDays(now, 1))) return "Yesterday";
  return format(d, "EEE d MMM");
}

// "Personal Info" roster. Everything except the PRISM report resolves its
// done-state from GET /me `personal_docs` (documents tagged
// resume/cv/bio/personal); PRISM resolves from GET /v1/documents/latest-prism
// instead, which is why it carries no `matches` list.
const PRISM_DOC_KIND = "prism";
const PERSONAL_INFO_CATALOG: {
  name: string;
  docKind: string;
  /** Absent for PRISM — see above. */
  matches?: string[];
  accept?: string;
  promptOverride?: string;
}[] = [
  {
    // NOTE: this entry does NOT use the tagged-upload modal — see
    // `openAddPersonalInfo`. It opens the PRISM import dialog, which parses the
    // CSV into scores. `docKind` is retained because it is what identifies this
    // row as the PRISM one; `accept`/`promptOverride` are unused for it.
    name: "Prism Rpt .csv",
    docKind: PRISM_DOC_KIND,
    accept: ".csv,text/csv",
  },
  { name: "Resume", docKind: "resume", matches: ["resume", "cv"] },
  { name: "Bio", docKind: "bio", matches: ["bio"] },
  { name: "Additional Info", docKind: "personal", matches: ["personal"] },
];

export default function HomeV2() {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [personalTarget, setPersonalTarget] =
    useState<AddPersonalDocTarget | null>(null);
  // PRISM has its own dialog — it imports scores rather than filing a document.
  const [prismReplaceOpen, setPrismReplaceOpen] = useState(false);
  // First name for the page greeting (restored 2026-08-06). Falls back through
  // fullName → name → "there" so the heading never renders "Welcome ,".
  const firstName =
    user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there";

  const {
    data: latestPrism,
    isLoading: prismLoading,
    isError: prismError,
    error: prismErrorObj,
    refetch: refetchPrism,
  } = useLatestPrism();
  // 404 = "no PRISM CSV yet", a real answer the hook deliberately does not
  // retry. Anything else (500, network, CORS) means we do not know.
  const prismErrorStatus = (prismErrorObj as AxiosError | null)?.response?.status;
  const hasReport = !prismError && !!latestPrism?.file_name;

  // Entitlement gates USE, not SIGHT: an unentitled quick action still renders
  // (greyed + locked) so the capability stays discoverable. `[]` is also the
  // loading default, so a slow query cannot flash a working link that the route
  // guard then rejects.
  const { data: entitledVerticals = [] } = useEnabledVerticals();
  const quickActions: WelcomeBackQuickAction[] = useMemo(
    () =>
      QUICK_ACTIONS.map(({ key, labelKey, defaultLabel, to, vertical, icon }) => {
        // Two independent reasons an action can be locked, and they must not be
        // conflated in the tooltip: the user has no entitlement, or the vertical
        // is switched off for everyone. Home is one of three ways into Job Fit
        // (sidebar and the Meridian header row are the others), so it has to
        // honour the force-disable or the "off" surface stays one click away.
        //
        // A third reason as of 2026-08-05: this specific Home shortcut is
        // switched off even though its vertical is fine everywhere else
        // (Self-Portrait, My Journey). Kept separate from the vertical-level
        // lever so turning a shortcut back on cannot accidentally re-enable a
        // vertical, or vice versa.
        const forcedOff =
          (vertical !== null && isVerticalForceDisabled(vertical)) ||
          LOCKED_QUICK_ACTIONS.has(key);
        return {
          key,
          label: t(labelKey, { defaultValue: defaultLabel }),
          to,
          icon,
          // A base-product action (vertical null) is entitled for everyone.
          entitled:
            (vertical === null || entitledVerticals.includes(vertical)) && !forcedOff,
          ...(forcedOff ? { lockedReason: WORKSPACE_ITEM_UNAVAILABLE_REASON } : {}),
        };
      }),
    [entitledVerticals, t],
  );

  // "What you worked on last visit" — the user's recent Meridian conversations,
  // newest first. Same hook and shape the chat History dropdown reads, so the
  // two cannot disagree about what the recent work was.
  const { data: convData, isLoading: convLoading } = useAgentConversation(
    AGENT_ID,
    { page: 1, limit: 20 },
  );
  const lastActions: WelcomeBackLastAction[] = useMemo(() => {
    const list = (convData as ConversationListResponse | undefined)?.data
      ?.conversations;
    if (!Array.isArray(list)) return [];
    const now = new Date();
    // Inclusive of the whole 5th day back, so the window is five calendar
    // days rather than 120 rolling hours — matching how the day headers read.
    const cutoff = startOfDay(subDays(now, LAST_ACTION_DAYS - 1)).getTime();
    return [...list]
      .filter((c) => {
        const raw = c.updated_at || c.created_at;
        if (!raw) return false;
        const ts = new Date(raw).getTime();
        // Drop unparseable timestamps: without one an entry cannot be placed
        // in the window or under a day header, and showing it anyway would
        // silently widen the range the heading promises.
        return Number.isFinite(ts) && ts >= cutoff;
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime(),
      )
      .slice(0, LAST_ACTION_MAX)
      .map((c) => ({
        id: c.id,
        label:
          c.title?.trim() ||
          t("homeV2.untitledConversation", {
            defaultValue: "Untitled conversation",
          }),
        meta: formatRelative(c.updated_at || c.created_at),
        dayLabel: dayBucket(c.updated_at || c.created_at, now),
      }));
  }, [convData, t]);

  const {
    data: profileMe,
    isError: profileError,
    refetch: refetchProfile,
  } = useMyProfile();
  const personalSet = useMemo(
    () => new Set((profileMe?.personal_docs ?? []).map((k) => k.toLowerCase())),
    [profileMe],
  );

  /**
   * A failed check is NOT an empty checklist item.
   *
   * `useLatestPrism` reports a 404 (genuinely no PRISM) and a 500/network
   * failure the same way to `hasReport`, and `personal_docs` is simply absent
   * when GET /me fails. Both used to render as an unticked row offering "Add",
   * which on 2026-08-19 told a user with a PRISM report on file that he had
   * none and invited him to upload it again.
   *
   * A 404 from `useLatestPrism` is a real answer and must stay "missing" — the
   * hook does not retry it, and treating it as unknown would put a permanent
   * warning on every new user's first visit. Only a non-404 error is unknown.
   */
  const prismUnknown =
    prismError &&
    (prismErrorStatus === undefined || prismErrorStatus !== 404);

  const personalInfo: WelcomeBackPersonalInfo[] = useMemo(
    () =>
      PERSONAL_INFO_CATALOG.map((p) => {
        if (p.matches) {
          // These read only from `personal_docs`, so /me failing is the only
          // thing that can make them unknowable.
          return {
            name: p.name,
            done: p.matches.some((k) => personalSet.has(k)),
            status: profileError
              ? ("unknown" as const)
              : p.matches.some((k) => personalSet.has(k))
                ? ("done" as const)
                : ("missing" as const),
          };
        }
        // The PRISM row has two independent sources; it is only unknowable
        // when BOTH failed. Either one answering "yes" still ticks it.
        const done = hasReport || personalSet.has(PRISM_DOC_KIND);
        return {
          name: p.name,
          done,
          status: done
            ? ("done" as const)
            : prismUnknown || profileError
              ? ("unknown" as const)
              : ("missing" as const),
        };
      }),
    [personalSet, hasReport, prismUnknown, profileError],
  );

  const retryPersonalInfo = useCallback(() => {
    void refetchPrism();
    void refetchProfile();
  }, [refetchPrism, refetchProfile]);

  /**
   * Open the Meridian chat.
   *
   * Deliberately does NOT deep-link to the clicked conversation: MeridianChat's
   * route-state contract is `prefillPrompt` / `autoSubmit` / `prefillDisplay`
   * only — it has no `conversationId` entry point, so passing one would be a
   * silent no-op that looks like a working link. This matches what the previous
   * "Last time we discussed…" button did. Deep-linking is a MeridianChat
   * change, not a Home one.
   */
  const goToChat = (conversationId?: string): void => {
    // Carrying the id opens that transcript in the Conversation tile; without
    // one the chat opens as it always did, on the user's current conversation.
    navigate(ROUTES.MERIDIAN_CHAT, {
      state: conversationId ? { conversationId } : {},
    });
  };

  const goToAssessment = (): void => {
    navigate(ROUTES.PRISM_ASSESSMENT);
  };

  // Resume / Bio / Additional Info → the tagged-upload modal, which uploads the
  // file with the right doc_kind so the profile loader can inject it.
  //
  // PRISM is NOT one of those. A PRISM CSV has to be PARSED into
  // `assessment_scores` + `prism_results` before anything can read it, and a
  // tagged upload does none of that. Until 2026-08-13 this entry went through
  // the same upload path as the others, which meant:
  //   * the file was stored and tagged `doc_kind='prism'`,
  //   * `GET /v1/documents/latest-prism` fell through to that raw file and
  //     answered 200, so this tile ticked to DONE,
  //   * and the user's score tables stayed empty.
  // Five users reached that state before anyone noticed. So PRISM routes to the
  // real self-service import (`POST /v1/prism/report/me/replace`), which parses
  // server-side and refuses a CSV that yields zero scores.
  const openAddPersonalInfo = (name: string): void => {
    const entry = PERSONAL_INFO_CATALOG.find((p) => p.name === name);
    if (!entry) return;
    if (entry.docKind === PRISM_DOC_KIND) {
      setPrismReplaceOpen(true);
      return;
    }
    setPersonalTarget({
      name: entry.name,
      docKind: entry.docKind,
      accept: entry.accept,
      promptOverride: entry.promptOverride,
    });
  };

  return (
    <UserLayout>
      {/* The page-level tan wrapper that used to sit here was removed on
          2026-08-06: the colour moved to SidebarScaffold so EVERY page gets it,
          and keeping this one would have nested the same tan inside itself. */}
      <div>
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {/* Page header (2026-08-06, request): greeting and the day's question
              on ONE line, with the three primary actions on the row beneath —
              left / centre / right. They were previously inside the tile's
              behavioral row. */}
          <header data-testid="homev2-header" className="pt-1">
            {/* The My Workspace guide pill used to sit beside this greeting.
                It moved to UserTopHeader on 2026-08-25 (request), so it now
                rides the app header beside "Welcome! {name}" and follows the
                user across their pages instead of living only on Home. */}
            <h1 className="font-serif text-[26px] leading-tight text-[#0B1B33]">
              {t("homeV2.welcomePrefix", { defaultValue: "Welcome" })}{" "}
              <span className="text-[#C9711A]">{firstName}</span>
              {" — "}
              <span className="text-[#4b5f80]">
                {t("homeV2.whatToday", {
                  defaultValue: "What are we working on today?",
                })}
              </span>
            </h1>

            {/* Three columns rather than a flex row with spacers, so the middle
                button is centred against the PAGE, not against whatever width
                its neighbours happen to be. On narrow screens the grid
                collapses to a stack and the justification classes stop
                applying. */}
            <div
              data-testid="homev2-header-actions"
              className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center"
            >
              <div className="sm:justify-self-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToChat()}
                  data-testid="homev2-chat-with-meridian"
                  className="w-full border-[rgba(11,27,51,0.10)] text-[#0B1B33] sm:w-auto"
                >
                  <MessageSquare className="size-4" />
                  {t("homeV2.chatWithMeridian", {
                    defaultValue: "Chat with Meridian",
                  })}
                </Button>
              </div>

              <div className="sm:justify-self-center">
                {/* "View PRISM Report" became the "Prism Data" dropdown on
                    2026-08-07 (request): the real PRISM PDF fetched from S3 plus
                    the Brain Map, instead of a single button that generated the
                    Self-Portrait. Still gated on `hasReport` — the same
                    condition the button used — so it never appears with nothing
                    behind it. The Self-Portrait itself stays reachable from the
                    tile's Self-Portrait quick action. */}
                {hasReport ? <PrismDataMenu /> : null}
              </div>

              <div className="sm:justify-self-end">
                <Button
                  type="button"
                  onClick={goToAssessment}
                  data-testid="homev2-request-prism-survey"
                  className="w-full bg-[#0B1B33] text-white hover:bg-[#0B1B33]/90 sm:w-auto"
                >
                  <CalendarDays className="size-4" />
                  {t("homeV2.requestPrismInventory", {
                    defaultValue: "Request PRISM Survey",
                  })}
                </Button>
              </div>
            </div>
          </header>

          {/* Leads the page since the Chat-with-Meridian card was removed
              (2026-08-05). */}
          <WelcomeBackTile
            lastActions={lastActions}
            lastActionsLoading={convLoading}
            onResumeConversation={goToChat}
            hasReport={hasReport}
            reportFileName={latestPrism?.file_name}
            prismLoading={prismLoading}
            personalInfo={personalInfo}
            onAddPersonalInfo={openAddPersonalInfo}
            onRetryPersonalInfo={retryPersonalInfo}
            quickActions={quickActions}
            videos={VIDEOS}
          />

          {/* The tile that embedded Lumen Moments — then called "Today's
              Prep" — was removed on 2026-08-06 (request). The surface itself is
              untouched: still its own page at /vertical/lumen/moments, still in
              the Meridian chat header, and still a pill in the quick-action row
              above — now labelled "Prep Me" (2026-09-04, by request: one
              destination had two names depending on the surface you came from).
              The `embedded` variant added for that tile stays on the component —
              it costs nothing and is the thing to reuse if it ever comes back. */}

          <AddPersonalDocModal
            target={personalTarget}
            onOpenChange={(open) => {
              if (!open) setPersonalTarget(null);
            }}
          />

          {/* PRISM's own path: parses the CSV into scores server-side rather
              than filing it as a document. */}
          <ReplacePrismDataDialog
            open={prismReplaceOpen}
            onOpenChange={setPrismReplaceOpen}
          />
        </div>
      </div>
    </UserLayout>
  );
}
