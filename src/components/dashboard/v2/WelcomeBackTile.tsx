import { useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Lock,
  Play,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

/** Prism Rpt .csv / Resume / Bio / Additional info — same shape, separate group. */
export interface WelcomeBackPersonalInfo {
  name: string;
  done: boolean;
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
  icon: LucideIcon;
}

interface WelcomeBackTileProps {
  displayName: string;
  lastTopic?: string;
  onResumeConversation: () => void;
  hasReport: boolean;
  reportFileName?: string;
  prismLoading?: boolean;
  onRequestAssessment: () => void;
  onViewReportPdf: () => void;
  profilePercent: number;
  assessments: WelcomeBackAssessment[];
  personalInfo: WelcomeBackPersonalInfo[];
  onAddAssessment?: (name: string) => void;
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
  onAdd,
}: {
  name: string;
  done: boolean;
  onAdd?: (name: string) => void;
}): JSX.Element {
  const { t } = useTranslation("dashboard");
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-2 text-[14px]">
        {done ? (
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-[#3E6B55]"
            aria-hidden="true"
          />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-[#7C93B5]" aria-hidden="true" />
        )}
        <span className={cn("truncate", done ? "text-[#3E6B55]" : "text-[#0B1B33]")}>
          {name}
        </span>
      </span>
      <button
        type="button"
        onClick={done ? undefined : () => onAdd?.(name)}
        disabled={done}
        aria-label={
          done
            ? t("homeV2.itemAdded", { defaultValue: "{{name}} added", name })
            : t("homeV2.addItem", { defaultValue: "Add {{name}}", name })
        }
        aria-disabled={done}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
          done
            ? "cursor-default border-[rgba(11,27,51,0.06)] bg-[#F1F1F1] text-[#9AA3B0]"
            : "border-[rgba(11,27,51,0.10)] bg-white text-[#C9711A] hover:bg-[#FBF7F0]",
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {t("homeV2.add", { defaultValue: "Add" })}
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
  testId,
}: {
  label: string;
  items: { name: string; done: boolean }[];
  onAdd?: (name: string) => void;
  testId: string;
}): JSX.Element {
  const { t } = useTranslation("dashboard");
  const [open, setOpen] = useState(false);
  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="rounded-xl border border-[rgba(11,27,51,0.10)] bg-[#FBF7F0]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        data-testid={testId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
      >
        <span className="text-[13px] font-semibold text-[#0B1B33]">{label}</span>
        <span className="inline-flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#7C93B5]">
            {t("homeV2.nOfM", {
              defaultValue: "{{done}} of {{total}}",
              done: doneCount,
              total: items.length,
            })}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-4 w-4 text-[#7C93B5] transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {open && (
        <ul className="grid grid-cols-1 gap-3 border-t border-[rgba(11,27,51,0.10)] px-4 py-3 sm:grid-cols-2">
          {items.map((item) => (
            <CompletionRow
              key={item.name}
              name={item.name}
              done={item.done}
              onAdd={onAdd}
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
}: {
  actions: WelcomeBackQuickAction[];
  videos: DashboardVideo[];
}): JSX.Element {
  const { t } = useTranslation("dashboard");
  const [videosOpen, setVideosOpen] = useState(false);
  const [playing, setPlaying] = useState<DashboardVideo | null>(null);

  return (
    <div className="mt-4" data-testid="homev2-quick-actions">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map(({ key, label, to, entitled, icon: Icon }) =>
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
              title={t("homeV2.quickActionLocked", {
                defaultValue: "{{name}} isn't enabled for your account",
                name: label,
              })}
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
  displayName,
  lastTopic,
  onResumeConversation,
  hasReport,
  reportFileName,
  prismLoading = false,
  onRequestAssessment,
  onViewReportPdf,
  profilePercent,
  assessments,
  personalInfo,
  onAddAssessment,
  onAddPersonalInfo,
  quickActions = [],
  videos = [],
}: WelcomeBackTileProps): JSX.Element {
  const { t } = useTranslation("dashboard");
  const pct = Math.max(0, Math.min(100, Math.round(profilePercent)));

  return (
    <div className="rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-6 shadow-sm">
      {/* 1. Header */}
      <h2 className="font-serif text-[22px] leading-tight text-[#0B1B33]">
        {t("homeV2.welcomeBackPrefix", { defaultValue: "Welcome back," })}{" "}
        <span className="text-[#C9711A]">{displayName}</span>.
      </h2>

      {/* 2. Continuation line */}
      <p className="mt-1.5 text-[13px] text-[#4b5f80]">
        {lastTopic ? (
          <>
            {t("homeV2.lastDiscussedPrefix", {
              defaultValue: "Last time we discussed",
            })}{" "}
            <button
              type="button"
              onClick={onResumeConversation}
              className="font-medium text-[#C9711A] underline underline-offset-2 hover:text-[#E8932B]"
            >
              {lastTopic}
            </button>
            {t("homeV2.lastDiscussedSuffix", {
              defaultValue: ". Continue, or start a new conversation?",
            })}
          </>
        ) : (
          <button
            type="button"
            onClick={onResumeConversation}
            className="text-start hover:text-[#0B1B33]"
          >
            {t("homeV2.continuePrompt", {
              defaultValue:
                "Continue where you left off, or start a new conversation?",
            })}
          </button>
        )}
      </p>

      {/* 3. Divider */}
      <div className="my-5 h-px w-full bg-[rgba(11,27,51,0.10)]" />

      {/* 4. Behavioral row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-base text-[#0B1B33]">
            {t("homeV2.behavioralAssessment", {
              defaultValue: "Behavioral assessment",
            })}
          </h3>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[#7C93B5]">
            {t("homeV2.poweredByPrism", { defaultValue: "Powered by PRISM" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={onRequestAssessment}
            className="bg-[#0B1B33] text-white hover:bg-[#0B1B33]/90"
          >
            <CalendarDays className="size-4" />
            {t("homeV2.requestPrismInventory", {
              defaultValue: "Request PRISM Inventory",
            })}
          </Button>
          {hasReport ? (
            <Button
              type="button"
              variant="outline"
              onClick={onViewReportPdf}
              className={cn("border-[rgba(11,27,51,0.10)] text-[#0B1B33]")}
            >
              <FileText className="size-4" />
              {t("homeV2.viewInventoryPdf", { defaultValue: "View Inventory PDF" })}
            </Button>
          ) : null}
        </div>
      </div>

      {prismLoading ? (
        <p className="mt-3 text-[13px] text-[#4b5f80]">
          {t("homeV2.checkingReport", {
            defaultValue: "Checking your latest report…",
          })}
        </p>
      ) : hasReport ? (
        <div className="mt-3 flex min-w-0 items-center gap-2 text-[13px] text-[#4b5f80]">
          <FileText className="size-3.5 shrink-0 text-[#7C93B5]" />
          <span className="min-w-0 truncate">
            {t("homeV2.latestReportPrefix", { defaultValue: "Latest report:" })}{" "}
            {reportFileName}
          </span>
          <BehavioralMapDialog />
        </div>
      ) : null}

      {/* 5. Complete-profile progress */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-medium text-[#0B1B33]">
            {t("homeV2.completeProfile", {
              defaultValue: "Complete profile ({{pct}}%)",
              pct,
            })}
          </span>
          <span className="font-serif text-[24px] leading-none text-[#0B1B33]">{pct}%</span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-[rgba(11,27,51,0.08)]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("homeV2.completeProfileAria", {
            defaultValue: "Complete profile",
          })}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#E8932B] to-[#5B8A72] transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 6. Quick actions — directly under the gauge. */}
      {(quickActions.length > 0 || videos.length > 0) && (
        <QuickActions actions={quickActions} videos={videos} />
      )}

      {/* 7. Divider */}
      <div className="my-5 h-px w-full bg-[rgba(11,27,51,0.10)]" />

      {/* 8. Personal Info + Other Assessments, as collapsed dropdowns. */}
      <div className="flex flex-col gap-3">
        <CompletionDropdown
          testId="homev2-personal-info-dropdown"
          label={t("homeV2.personalInfo", { defaultValue: "Personal Info" })}
          items={personalInfo}
          onAdd={onAddPersonalInfo}
        />
        <CompletionDropdown
          testId="homev2-other-assessments-dropdown"
          label={t("homeV2.otherAssessments", {
            defaultValue: "Other Assessments",
          })}
          items={assessments}
          onAdd={onAddAssessment}
        />
      </div>
    </div>
  );
}
