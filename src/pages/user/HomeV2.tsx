import { useMemo, useState } from "react";
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
  Briefcase,
  ChevronDown,
  Compass,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";
import UserLayout from "@/layouts/UserLayout";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/useAuth";
import { ROUTES } from "@/constants/routes";
import { useEnabledVerticals } from "@/verticals/core";
import { isVerticalForceDisabled } from "@/components/layout/useVerticalLauncher";
import { WORKSPACE_ITEM_UNAVAILABLE_REASON } from "@/constants/navigation";
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
import {
  ProfileDocViewerDialog,
  type ViewableDoc,
} from "@/components/dashboard/v2/ProfileDocViewerDialog";
import { generatePrismReport } from "@/services/documents/prismReport.service";
import { useAgentConversation } from "@/hooks/agents/useAgentConversation";
import Moments from "@/pages/lumen/Moments";
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
 * Layout (2026-08-05) — two tiles, nothing below them:
 *   1. WelcomeBackTile — last-visit summary + behavioral row, then the
 *      quick-action row (Self-Portrait / Today's Prep / My Journey / Job Fit /
 *      Videos) with the Personal Info dropdown pinned to its end.
 *   2. Today's Prep    — the Lumen "Moments" surface, embedded.
 *
 * The MeridianEngageCard ("Chat with Meridian") that used to lead the page was
 * removed on request; WelcomeBackTile moved up into its place. Meridian is
 * still one click away from the sidebar, so nothing became unreachable.
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
 *     Today's Prep and Job Fit. Same destination, in the row people scan.
 *   - Uploaded profile material is listed under the PRISM line and opens in a
 *     viewer modal, as does "View Inventory PDF" — previously that button
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
  vertical: string;
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
    defaultLabel: "Today's Prep",
    to: ROUTES.LUMEN.MOMENTS,
    vertical: "lumen",
    icon: Sparkles,
  },
  // My Journey replaces the standalone Direction Setting card that used to sit
  // at the bottom of Home. Same destination, but it now lives in the row people
  // actually scan instead of below the fold.
  {
    key: "my-journey",
    labelKey: "homeV2.quickMyJourney",
    defaultLabel: "My Journey",
    to: ROUTES.DIRECTION_SETTING.JOURNEY,
    vertical: "direction-setting",
    icon: Compass,
  },
  {
    key: "job-fit",
    labelKey: "homeV2.quickJobFit",
    defaultLabel: "Job Fit",
    to: ROUTES.JOB_FIT.MATCHES,
    vertical: "job-fit",
    icon: Briefcase,
  },
];

/**
 * Quick actions switched off for everyone (2026-08-05, on request).
 *
 * Distinct from `isVerticalForceDisabled`, which turns off a whole vertical
 * everywhere it appears. Lumen and Direction Setting are still live products —
 * only these two Home shortcuts are being withheld — so the lever is per
 * quick-action key, and both verticals keep working elsewhere.
 */
const LOCKED_QUICK_ACTIONS = new Set(["self-portrait", "my-journey"]);

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
 * Safety cap on rendered rows. The window is the real filter; this only stops
 * a very heavy week from producing an unbounded list.
 */
const LAST_ACTION_MAX = 40;

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
    name: "Prism Rpt .csv",
    docKind: PRISM_DOC_KIND,
    accept: ".csv,text/csv",
    promptOverride:
      "Upload your PRISM report (.csv). We'll tag it as your PRISM result so Meridian can read your brain map in every chat.",
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
  const [viewDoc, setViewDoc] = useState<ViewableDoc | null>(null);
  // Today's Prep starts closed so Moments does not fetch on every Home load.
  const [todaysPrepOpen, setTodaysPrepOpen] = useState(false);
  // `user` is still read for the profile queries below; the name is no longer
  // rendered since the greeting was replaced by the last-visit summary.
  void user;

  const {
    data: latestPrism,
    isLoading: prismLoading,
    isError: prismError,
  } = useLatestPrism();
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
          isVerticalForceDisabled(vertical) || LOCKED_QUICK_ACTIONS.has(key);
        return {
          key,
          label: t(labelKey, { defaultValue: defaultLabel }),
          to,
          icon,
          entitled: entitledVerticals.includes(vertical) && !forcedOff,
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

  const { data: profileMe } = useMyProfile();
  const personalSet = useMemo(
    () => new Set((profileMe?.personal_docs ?? []).map((k) => k.toLowerCase())),
    [profileMe],
  );
  const personalInfo: WelcomeBackPersonalInfo[] = useMemo(
    () =>
      PERSONAL_INFO_CATALOG.map((p) => ({
        name: p.name,
        done: p.matches
          ? p.matches.some((k) => personalSet.has(k))
          : hasReport || personalSet.has(PRISM_DOC_KIND),
      })),
    [personalSet, hasReport],
  );

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

  /**
   * "View Inventory PDF" — build the report, then show it.
   *
   * It used to open the *stored* PRISM document. For anyone whose PRISM arrived
   * by import that document is a synthesised `text/csv` row at an S3 key with
   * no object behind it, so the viewer said "this file type can't be previewed
   * here" and the new-tab fallback 404'd. Both confirmed on dev.
   *
   * Now it asks the backend to render the report (the Self-Portrait, through
   * the shared docgen engine) and passes the returned URL straight to the
   * viewer. Generated per click rather than cached — the URL is presigned and
   * short-lived, and a dead link is exactly what this replaced.
   */
  const openPrismReport = async (): Promise<void> => {
    const label = t("homeV2.prismReport", { defaultValue: "PRISM Report" });
    // Show the dialog immediately in its loading state. Generation takes a
    // moment, and a button that looks inert until a document appears reads as
    // broken — which is the impression this whole path is fixing.
    setViewDoc({ id: "prism-report", label, pending: true });
    try {
      const report = await generatePrismReport("pdf");
      setViewDoc({
        id: "prism-report",
        label,
        fileName: report.fileName,
        contentType: report.contentType,
        url: report.downloadUrl,
      });
    } catch {
      setViewDoc({ id: "prism-report", label, failed: true });
    }
  };

  // PRISM / Resume / Bio / Additional Info → open the tagged-upload modal,
  // which uploads the file with the right doc_kind so the profile loader can
  // inject it.
  const openAddPersonalInfo = (name: string): void => {
    const entry = PERSONAL_INFO_CATALOG.find((p) => p.name === name);
    if (entry)
      setPersonalTarget({
        name: entry.name,
        docKind: entry.docKind,
        accept: entry.accept,
        promptOverride: entry.promptOverride,
      });
  };

  return (
    <UserLayout>
      <div className="rounded-2xl bg-[#FBF7F0] p-4 md:p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {/* Leads the page since the Chat-with-Meridian card was removed
              (2026-08-05). */}
          <WelcomeBackTile
            lastActions={lastActions}
            lastActionsLoading={convLoading}
            onResumeConversation={goToChat}
            hasReport={hasReport}
            reportFileName={latestPrism?.file_name}
            prismLoading={prismLoading}
            onRequestAssessment={goToAssessment}
            onViewReportPdf={() => { void openPrismReport(); }}
            personalInfo={personalInfo}
            onAddPersonalInfo={openAddPersonalInfo}
            quickActions={quickActions}
            videos={VIDEOS}
          />

          {/* Today's Prep — the Lumen "Moments" surface, embedded rather than
              linked. Same component the /vertical/lumen/moments page renders
              (`embedded` drops its page heading and padding), so the two cannot
              drift apart.

              Collapsed on load as of 2026-08-05, and deliberately NOT merely
              hidden with CSS: `Moments` is only mounted once the user opens
              the section, so its data fetching no longer runs on every Home
              load for a surface most visits never look at. */}
          <section
            data-testid="homev2-todays-prep"
            aria-labelledby="homev2-todays-prep-heading"
            className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-6 shadow-sm"
          >
            <button
              type="button"
              id="homev2-todays-prep-heading"
              onClick={() => setTodaysPrepOpen((open) => !open)}
              aria-expanded={todaysPrepOpen}
              aria-controls="homev2-todays-prep-panel"
              data-testid="homev2-todays-prep-toggle"
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <h2 className="font-serif text-[22px] leading-tight text-[#0B1B33]">
                {t("homeV2.todaysPrep", { defaultValue: "Today's Prep" })}
              </h2>
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-5 shrink-0 text-[#7C93B5] transition-transform",
                  todaysPrepOpen && "rotate-180",
                )}
              />
            </button>
            {todaysPrepOpen && (
              <div className="mt-4" id="homev2-todays-prep-panel">
                <Moments embedded />
              </div>
            )}
          </section>

          <AddPersonalDocModal
            target={personalTarget}
            onOpenChange={(open) => {
              if (!open) setPersonalTarget(null);
            }}
          />

          <ProfileDocViewerDialog
            doc={viewDoc}
            onOpenChange={(open) => {
              if (!open) setViewDoc(null);
            }}
          />
        </div>
      </div>
    </UserLayout>
  );
}
