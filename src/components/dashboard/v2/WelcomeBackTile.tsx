import { useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Lock,
  Play,
  Plus,
  type LucideIcon,
  AlertCircle,
  RefreshCw
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DashboardVideo } from "@/components/dashboard/v2/WatchVideoCard";
import { BehavioralMapDialog } from "@/components/dashboard/v2/BehavioralMapDialog";

export interface WelcomeBackAssessment {
  name: string;
  done: boolean;
}

/**
 * A completeness item can be in THREE states, not two.
 *
 * `done: false` used to carry both "the user has not uploaded this" and "we
 * could not find out" — and the second is not an empty state, it is a failed
 * request wearing one. On 2026-08-19 a user with a PRISM report on file was
 * shown PRISM as unticked; `hasReport` is `!prismError && !!file_name`, so any
 * error on GET /v1/documents/latest-prism renders identically to having
 * nothing. The row then offers "Add", inviting someone to re-upload a report
 * the platform already has.
 *
 * `status: "unknown"` keeps the two apart. `done` is retained so existing
 * callers and tests keep working; when both are supplied `status` wins.
 */
export type WelcomeBackItemStatus = "done" | "missing" | "unknown";

/** Prism Rpt .csv / Resume / Bio / Additional info — same shape, separate group. */
export interface WelcomeBackPersonalInfo {
  name: string;
  done: boolean;
  /** Omit for the usual done/missing split; "unknown" means the check failed. */
  status?: WelcomeBackItemStatus;
}

/** `status` when present, else derived from the legacy `done` boolean. */
function itemStatus(item: {
  done: boolean;
  status?: WelcomeBackItemStatus;
}): WelcomeBackItemStatus {
  return item.status ?? (item.done ? "done" : "missing");
}

/**
 * A quick-action link under the completion gauge (Self-Portrait, Today's Prep,
 * Job Fit). `entitled` follows the platform rule that **entitlement gates USE,
 * not SIGHT**: an unentitled action stays visible so the capability is
 * discoverable, but renders greyed, locked and non-navigating rather than as a
 * link that bounces off the route guard.
 */
export interface WelcomeBackQuickAction {
  key: string;
  label: string;
  to: string;
  entitled: boolean;
  /**
   * Overrides the locked tooltip. The default wording blames the user's plan,
   * which is only true for an entitlement gate — an action switched off for
   * everyone (see `isVerticalForceDisabled`) must say so instead of telling an
   * entitled user their account lacks something it has.
   */
  lockedReason?: string;
  icon: LucideIcon;
}

/** One thing the user worked on last visit — a recent conversation. */
export interface WelcomeBackLastAction {
  id: string;
  label: string;
  /** Relative time ("2 days ago"); omitted when the timestamp is unusable. */
  meta?: string;
  /**
   * Day bucket ("Today", "Yesterday", "Mon 4 Aug"). Entries arrive newest
   * first already grouped by the host; the tile renders a header wherever
   * this changes. Omitted when the timestamp is unusable.
   */
  dayLabel?: string;
}

interface WelcomeBackTileProps {
  /**
   * What the user worked on last visit, newest first. Replaces the
   * "Welcome back, {name}" greeting (2026-08-05): the greeting said nothing the
   * user did not already know, where this resumes their actual work.
   */
  lastActions?: WelcomeBackLastAction[];
  lastActionsLoading?: boolean;
  /**
   * Open the Meridian chat, optionally on a specific conversation.
   *
   * The id argument landed 2026-08-05 together with the chat page's deep-link
   * entry point. Before that this deliberately took no id, because the chat
   * had no way to open one and the callback would have promised navigation
   * the host could not deliver. It can now, so picking a topic resumes that
   * transcript instead of opening a blank chat. Called with no argument from
   * the empty-state "start a conversation" link.
   */
  onResumeConversation: (conversationId?: string) => void;
  hasReport: boolean;
  reportFileName?: string;
  prismLoading?: boolean;
  // `onRequestAssessment` and `onViewReportPdf` were dropped on 2026-08-06:
  // both buttons moved to the page header, and the host owns them there. The
  // tile still receives `hasReport`/`reportFileName` because it renders the
  // "Latest report" line beside "Powered by PRISM".
  personalInfo: WelcomeBackPersonalInfo[];
  /** Re-run the queries behind the checklist after a failed check. */
  onRetryPersonalInfo?: () => void;
  onAddPersonalInfo?: (name: string) => void;
  /** Quick-action links rendered directly under the completion gauge. */
  quickActions?: WelcomeBackQuickAction[];
  /** Populates the "Videos" quick-action dropdown; each plays in a modal. */
  videos?: DashboardVideo[];
}

/**
 * One "Add"/"done" row shared by both the assessment and personal-info
 * groups: a left indicator (✓ when the item exists, ○ when missing), the
 * label, then an Add pill on the right. When the item already exists the Add
 * pill is greyed + disabled and the checkmark is filled — the completeness
 * contract requested for HomeV3.
 */
function CompletionRow({
  name,
  done,
  status,
  onAdd,
  onRetry,
}: {
  name: string;
  done: boolean;
  status?: WelcomeBackItemStatus;
  onAdd?: (name: string) => void;
  onRetry?: () => void;
}): JSX.Element {
  const { t } = useTranslation("dashboard");
  const state = itemStatus({ done, status });
  const isDone = state === "done";
  const isUnknown = state === "unknown";
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-2 text-[14px]">
        {isDone ? (
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-[#3E6B55]"
            aria-hidden="true"
          />
        ) : isUnknown ? (
          <AlertCircle
            className="h-4 w-4 shrink-0 text-[#C9711A]"
            aria-hidden="true"
          />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-[#7C93B5]" aria-hidden="true" />
        )}
        <span
          className={cn(
            "truncate",
            isDone ? "text-[#3E6B55]" : isUnknown ? "text-[#C9711A]" : "text-[#0B1B33]",
          )}
        >
          {name}
          {isUnknown ? (
            <span className="ms-1 text-[12px] font-medium">
              {t("homeV2.checkFailed", { defaultValue: "— couldn't check" })}
            </span>
          ) : null}
        </span>
      </span>
      <button
        type="button"
        onClick={
          isUnknown ? () => onRetry?.() : isDone ? undefined : () => onAdd?.(name)
        }
        disabled={isDone}
        aria-label={
          isDone
            ? t("homeV2.itemAdded", { defaultValue: "{{name}} added", name })
            : isUnknown
              ? t("homeV2.retryItem", {
                  defaultValue: "Retry checking {{name}}",
                  name,
                })
              : t("homeV2.addItem", { defaultValue: "Add {{name}}", name })
        }
        aria-disabled={isDone}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
          isDone
            ? "cursor-default border-[rgba(11,27,51,0.06)] bg-[#F1F1F1] text-[#9AA3B0]"
            : "border-[rgba(11,27,51,0.10)] bg-white text-[#C9711A] hover:bg-[#FBF7F0]",
        )}
      >
        {isUnknown ? (
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {isUnknown
          ? t("homeV2.retry", { defaultValue: "Retry" })
          : t("homeV2.add", { defaultValue: "Add" })}
      </button>
    </li>
  );
}

/**
 * A labelled disclosure with an "n of m" progress hint in the trigger, so the
 * user can see how complete a group is *without* opening it — otherwise
 * collapsing the two completeness lists would hide the very signal the
 * completion gauge is asking them to act on.
 */
function CompletionDropdown({
  label,
  items,
  onAdd,
  onRetry,
  testId,
}: {
  label: string;
  items: { name: string; done: boolean; status?: WelcomeBackItemStatus }[];
  onAdd?: (name: string) => void;
  onRetry?: () => void;
  testId: string;
}): JSX.Element {
  const { t } = useTranslation("dashboard");
  const [open, setOpen] = useState(false);
  const doneCount = items.filter((i) => itemStatus(i) === "done").length;
  // An item we could not check is not a *missing* item, so the trigger must not
  // imply the user has work to do. "3 of 4" with a warning marker is honest;
  // silently counting unknowns as incomplete is what sent a user to re-upload
  // a PRISM report he had already uploaded.
  const unknownCount = items.filter((i) => itemStatus(i) === "unknown").length;

  // Sized to its content and floated open, rather than a full-width block that
  // pushed the tile taller (2026-08-05). It now sits at the end of the
  // quick-action row, so an inline expansion would shove that row's layout
  // around every time it opened — hence the absolute panel, matching Videos.
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        data-testid={testId}
        className={cn(
          QUICK_PILL,
          "border-[rgba(11,27,51,0.10)] bg-[#FBF7F0] text-[#0B1B33] hover:bg-white",
        )}
      >
        <span className="font-semibold">{label}</span>
        <span className="text-[12px] font-medium text-[#7C93B5]">
          {t("homeV2.nOfM", {
            defaultValue: "{{done}} of {{total}}",
            done: doneCount,
            total: items.length,
          })}
        </span>
        {unknownCount > 0 ? (
          <AlertCircle
            data-testid={`${testId}-unknown-marker`}
            className="h-3.5 w-3.5 shrink-0 text-[#C9711A]"
            aria-label={t("homeV2.someChecksFailed", {
              defaultValue: "{{count}} item could not be checked",
              count: unknownCount,
            })}
          />
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 text-[#7C93B5] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          data-testid={`${testId}-panel`}
          className="absolute end-0 z-20 mt-1 flex w-72 flex-col gap-3 rounded-xl border border-[rgba(11,27,51,0.10)] bg-white px-4 py-3 shadow-lg"
        >
          {items.map((item) => (
            <CompletionRow
              key={item.name}
              name={item.name}
              done={item.done}
              status={item.status}
              onAdd={onAdd}
              onRetry={onRetry}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shared pill styling for the quick-action row. */
const QUICK_PILL =
  "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors";

/**
 * Quick actions + a Videos dropdown. The videos previously had a tile of their
 * own; folding them in here keeps them reachable from the same row without
 * spending a full-width card on a player nobody had opened yet.
 */
function QuickActions({
  actions,
  videos,
  trailing,
}: {
  actions: WelcomeBackQuickAction[];
  videos: DashboardVideo[];
  /** Pinned to the end of the row — the Personal Info dropdown. */
  trailing?: JSX.Element | null;
}): JSX.Element {
  const { t } = useTranslation("dashboard");
  const [videosOpen, setVideosOpen] = useState(false);
  const [playing, setPlaying] = useState<DashboardVideo | null>(null);

  return (
    // The "View these videos on how to get the most from InspiresGenius" line
    // that sat above this row was removed on 2026-08-06 (request). The Videos
    // control itself stays in the row — only the sentence went.
    <div className="mt-4" data-testid="homev2-quick-actions">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map(({ key, label, to, entitled, lockedReason, icon: Icon }) =>
          entitled ? (
            <Link
              key={key}
              to={to}
              data-testid={`homev2-quick-${key}`}
              className={cn(
                QUICK_PILL,
                "border-[rgba(11,27,51,0.10)] bg-white text-[#0B1B33] hover:bg-[#FBF7F0]",
              )}
            >
              <Icon className="h-4 w-4 text-[#C9711A]" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ) : (
            <span
              key={key}
              data-testid={`homev2-quick-${key}`}
              aria-disabled="true"
              title={
                lockedReason ??
                t("homeV2.quickActionLocked", {
                  defaultValue: "{{name}} isn't enabled for your account",
                  name: label,
                })
              }
              className={cn(
                QUICK_PILL,
                "cursor-not-allowed border-[rgba(11,27,51,0.06)] bg-[#F1F1F1] text-[#9AA3B0]",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          ),
        )}

        {videos.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setVideosOpen((prev) => !prev)}
              aria-expanded={videosOpen}
              data-testid="homev2-quick-videos"
              className={cn(
                QUICK_PILL,
                "border-[rgba(11,27,51,0.10)] bg-white text-[#0B1B33] hover:bg-[#FBF7F0]",
              )}
            >
              <Play className="h-4 w-4 text-[#C9711A]" aria-hidden="true" />
              <span>{t("homeV2.videos", { defaultValue: "Videos" })}</span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 text-[#7C93B5] transition-transform",
                  videosOpen && "rotate-180",
                )}
              />
            </button>

            {videosOpen && (
              <ul className="absolute left-0 z-20 mt-1 w-72 overflow-hidden rounded-xl border border-[rgba(11,27,51,0.10)] bg-white py-1 shadow-lg">
                {videos.map((video) => (
                  <li key={video.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPlaying(video);
                        setVideosOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-start text-[13px] text-[#0B1B33] transition-colors hover:bg-[#FBF7F0]"
                    >
                      <Play
                        className="h-3.5 w-3.5 shrink-0 text-[#7C93B5]"
                        aria-hidden="true"
                      />
                      <span className="truncate">{video.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Personal Info sits at the END of this row (2026-08-05) — it used to
            be a full-width block below, which spent a whole row of the tile on
            a control that is closed most of the time. */}
        {trailing ? <div className="ms-auto">{trailing}</div> : null}
      </div>

      <Dialog
        open={playing !== null}
        onOpenChange={(open) => {
          if (!open) setPlaying(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{playing?.title}</DialogTitle>
          </DialogHeader>
          {playing && (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              {/* keyed so switching videos remounts the element rather than
                  leaving the previous source buffered and playing. */}
              <video
                key={playing.id}
                src={playing.src}
                controls
                autoPlay
                preload="metadata"
                playsInline
                className="h-full w-full bg-black object-contain"
                aria-label={playing.title}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function WelcomeBackTile({
  lastActions = [],
  lastActionsLoading = false,
  onResumeConversation,
  hasReport,
  reportFileName,
  prismLoading = false,
  personalInfo,
  onRetryPersonalInfo,
  onAddPersonalInfo,
  quickActions = [],
  videos = [],
}: WelcomeBackTileProps): JSX.Element {
  const { t } = useTranslation("dashboard");

  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-6 shadow-sm">
      {/* 1. Header — what you worked on last visit.
          Replaced "Welcome back, {name}" on 2026-08-05: the greeting told the
          user their own name, where this hands back the thread they were on.
          Each entry resumes that conversation. */}
      {/* `text-left` is explicit rather than relying on the default: the
          heading is the tile's first line and nothing downstream should be
          able to centre it by inheriting alignment from a future wrapper. */}
      <h2 className="text-left font-serif text-[22px] leading-tight text-[#0B1B33]">
        {t("homeV2.lastVisitHeading", {
          defaultValue: "Here's what you worked on last visit.",
        })}
      </h2>

      {lastActionsLoading ? (
        <p className="mt-1.5 text-[13px] text-[#4b5f80]">
          {t("homeV2.loadingActivity", { defaultValue: "Loading activity…" })}
        </p>
      ) : lastActions.length > 0 ? (
        // Inline again as of 2026-08-06 (request): show the last four topics
        // outright rather than behind a "Recent topics (n)" dropdown.
        //
        // The dropdown existed because an uncapped list grew without bound and
        // pushed the page down. That concern is handled by the cap instead —
        // the host slices to LAST_ACTION_LIMIT — so the tile keeps a bounded
        // height while the topics are visible without a click.
        //
        // Each row deep-links: `onResumeConversation(id)` navigates to the chat
        // with that conversation selected.
        <ul
          className="mt-2 flex flex-col"
          data-testid="homev2-last-actions"
        >
          {lastActions.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                onClick={() => onResumeConversation(action.id)}
                data-testid={`homev2-last-action-${action.id}`}
                className="-mx-2 flex w-[calc(100%+1rem)] min-w-0 items-baseline gap-2 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-[#FBF7F0]"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#C9711A] underline underline-offset-2">
                  {action.label}
                </span>
                {action.meta ? (
                  <span className="shrink-0 text-[12px] text-[#7C93B5]">
                    {action.meta}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        // No history yet: say so plainly and offer the one useful next step,
        // rather than an empty list that reads as a failed fetch.
        <p className="mt-1.5 text-[13px] text-[#4b5f80]">
          {t("homeV2.noLastVisit", {
            defaultValue: "Nothing yet —",
          })}{" "}
          <button
            type="button"
            onClick={() => onResumeConversation()}
            className="font-medium text-[#C9711A] underline underline-offset-2 hover:text-[#E8932B]"
          >
            {t("homeV2.startConversation", {
              defaultValue: "start a conversation",
            })}
          </button>
        </p>
      )}

      {/* 3. Divider */}
      <div className="my-5 h-px w-full bg-[rgba(11,27,51,0.10)]" />

      {/* 4. Behavioral row.
          The three buttons that used to sit on the right — Chat with Meridian,
          Request PRISM Survey, View PRISM Report — moved to the page header
          above the tile on 2026-08-06 (request), so this row is now the label
          plus the report status only.
          "Latest report: …" moved up beside "Powered by PRISM" in the same
          move: it is a property of the assessment, and it was previously a
          detached line below the row. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-base text-[#0B1B33]">
            {t("homeV2.behavioralAssessment", {
              defaultValue: "Behavioral assessment",
            })}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#7C93B5]">
              {t("homeV2.poweredByPrism", { defaultValue: "Powered by PRISM" })}
            </p>
            {prismLoading ? (
              <span className="text-[13px] text-[#4b5f80]">
                {t("homeV2.checkingReport", {
                  defaultValue: "Checking your latest report…",
                })}
              </span>
            ) : hasReport ? (
              <span
                className="flex min-w-0 items-center gap-2 text-[13px] text-[#4b5f80]"
                data-testid="homev2-latest-report"
              >
                <FileText className="size-3.5 shrink-0 text-[#7C93B5]" />
                <span className="min-w-0 truncate">
                  {t("homeV2.latestReportPrefix", {
                    defaultValue: "Latest report:",
                  })}{" "}
                  {reportFileName}
                </span>
                <BehavioralMapDialog />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5. Quick actions.
          The "Your material" list that used to sit here — every uploaded
          résumé/bio rendered as a link — was removed on request. Uploaded
          material is still reachable from the Personal Info dropdown below and
          from the Documents surface; nothing became unreachable, the Home tile
          just stopped listing files. */}
      {/* Personal Info now rides at the end of this row rather than as its own
          full-width block below it, and "Other Assessments" was removed
          entirely (2026-08-05, both on request). Adding a DISC/MBTI/Clifton
          result is still possible from the Documents surface — the Home
          shortcut went, not the capability. */}
      {/* `personalInfo` counts toward rendering this row: it now LIVES in the
          row, so gating solely on actions/videos would silently drop Personal
          Info for anyone with neither. */}
      {(quickActions.length > 0 ||
        videos.length > 0 ||
        personalInfo.length > 0) && (
        <QuickActions
          actions={quickActions}
          videos={videos}
          trailing={
            personalInfo.length > 0 ? (
              <CompletionDropdown
                testId="homev2-personal-info-dropdown"
                label={t("homeV2.personalInfo", { defaultValue: "Personal Info" })}
                items={personalInfo}
                onAdd={onAddPersonalInfo}
                onRetry={onRetryPersonalInfo}
              />
            ) : null
          }
        />
      )}
    </div>
  );
}
