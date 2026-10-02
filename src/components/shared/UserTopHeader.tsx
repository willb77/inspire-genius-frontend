import { ChevronDown, PlayCircle } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/useAuth";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useLocation, useNavigate } from "react-router-dom";
import { ROLES, ROUTES } from "@/constants/routes";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * The My Workspace tour (4:13), narrated: Home and the seven sidebar pages.
 *
 * A durable object URL on the public demo bucket the Home videos already play
 * from: no auth, no expiry. A presigned link would lapse and leave a dead pill
 * in the header of every page, which is worse than the one it replaced.
 *
 * Re-recorded 2026-08-26. Pointed at a NEW key rather than overwriting
 * `My_Workspace_userguide.mp4` in place: that bucket is served straight from
 * S3 with `max-age=86400` and no CloudFront in front, so an overwrite has no
 * invalidation path — anyone who had already played the old film would keep
 * getting it for up to a day, with nothing anyone could do about it. A new key
 * is correct for every viewer the moment this deploys.
 *
 * Replaced again 2026-10-02 by `IG_My_Workspace.mp4`, a new key for the same
 * reason. `My_Workspace_Orientation.mp4` stays in the bucket untouched.
 */
const WORKSPACE_GUIDE_VIDEO_URL =
  "https://ig-demo-public-videos.s3.amazonaws.com/IG_My_Workspace.mp4";

/**
 * The Interview Studio tour (2:52), narrated: Interview Studio, Recording &
 * consent, Live Interview and its setup, and Practice Interview. Same public
 * demo bucket and the same new-key-not-overwrite rule as the film above.
 */
const INTERVIEW_STUDIO_GUIDE_VIDEO_URL =
  "https://ig-demo-public-videos.s3.amazonaws.com/IG_Interview_Studio.mp4";

/**
 * Interview Studio and its sub-pages: the per-role Interview Studio and Live
 * Interview routes (the nav group in `navigation.ts`), plus the shared Practice
 * Interview page. These take the Interview Studio film instead of the My
 * Workspace one — including inside the role consoles, which otherwise show no
 * pill at all.
 */
const INTERVIEW_STUDIO_PREFIXES = [
  "/super-admin/interview-studio",
  "/super-admin/interview-live",
  "/manager/interview-studio",
  "/manager/interview-live",
  "/practitioner/interview-studio",
  "/practitioner/interview-live",
  "/interview-practice",
];

/**
 * The Goals Studio tour, narrated. The person's goal titles are blurred in the
 * published copy (the original local file is not).
 */
const GOALS_STUDIO_GUIDE_VIDEO_URL =
  "https://ig-demo-public-videos.s3.amazonaws.com/Goals_studio.mp4";

/**
 * Goals Studio and its sub-pages (overview, discovery, interview, sharing,
 * coaches, a goal's roadmap) — one tree for every role. Direction Setting's
 * `/vertical/direction-setting/goals` is a different surface and is excluded.
 */
const GOALS_STUDIO_PREFIXES = ["/my/goals"];

/**
 * Route prefixes where the guide pill is NOT shown.
 *
 * This header is rendered by SidebarScaffold for all six roles, so an ungated
 * pill would appear on every admin console too. The film is about My Workspace
 * — the user-role surface — so it follows the user's own pages and stays out of
 * the role consoles rather than being shown everywhere or only on /home.
 */
const ROLE_CONSOLE_PREFIXES = [
  "/super-admin",
  "/manager",
  "/company-admin",
  "/practitioner",
  "/distributor",
];

const matchesPrefix = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

type GuidePill = { label: string; url: string; testId: string };

/** Which guide film, if any, the header offers on this route. */
function guidePillFor(pathname: string): GuidePill | null {
  if (matchesPrefix(pathname, INTERVIEW_STUDIO_PREFIXES)) {
    return {
      label: "Watch: Interview Studio",
      url: INTERVIEW_STUDIO_GUIDE_VIDEO_URL,
      testId: "interview-studio-guide-video",
    };
  }
  if (matchesPrefix(pathname, GOALS_STUDIO_PREFIXES)) {
    return {
      label: "Watch: Goals Studio",
      url: GOALS_STUDIO_GUIDE_VIDEO_URL,
      testId: "goals-studio-guide-video",
    };
  }
  if (matchesPrefix(pathname, ROLE_CONSOLE_PREFIXES)) return null;
  return {
    label: "Watch: My Workspace guide",
    url: WORKSPACE_GUIDE_VIDEO_URL,
    testId: "workspace-guide-video",
  };
}

export default function UserTopHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const guide = guidePillFor(pathname);
  const email = user?.email ?? "";
  const role = user?.role ?? "";
  const fallbackName = (email && email.split("@")[0]) || "User";
  const displayName = (user?.fullName && user.fullName.trim()) ? (user.fullName as string) : fallbackName;
  const initial = (displayName?.[0] ?? "U").toUpperCase();
  return (
    <div className="mt-2 flex items-center justify-between w-full">
      {/* The greeting column and the guide pill sit on one row, so the pill
          lands immediately right of the two-line greeting rather than below it.
          `min-w-0` stays on the column, not this wrapper — it is what lets the
          name keep truncating instead of pushing the pill off the header. */}
      <div className="ml-1 flex-1 min-w-0 flex items-center gap-3">
        <div className="min-w-0 flex flex-col text-left">
          <p className="font-serif text-sm sm:text-base md:text-2xl font-medium text-ink truncate">Welcome! {displayName}</p>
          <p className="text-xs text-black-250 hidden sm:block">
            Your AI coaches are ready—let’s begin!
          </p>
        </div>
        {/* Orientation film for the current surface. A plain anchor, not
            `window.open`: `window.open(url, "_blank", "noopener")` returns null
            and navigates the CURRENT tab in some browsers, which would drop the
            user out of the app mid-session. `rel` carries noopener anyway.

            Hidden below `sm`, matching the subtitle above it — the header is
            56px tall and already carries three controls on the right, so on a
            phone the pill would squeeze the name it sits beside. */}
        {guide && (
          <a
            href={guide.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={guide.testId}
            className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#C9711A]/35 bg-[#C9711A]/10 px-3 py-1 text-[13px] font-semibold text-[#9C560F] transition-colors hover:bg-[#C9711A]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9711A]"
          >
            <PlayCircle className="size-4" aria-hidden />
            {guide.label}
          </a>
        )}
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open profile menu"
              className="flex items-center gap-2 rounded-2xl bg-gray-50 px-2.5 py-1.5 shadow-sm hover:bg-gray-100"
            >
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-200">
                <span className="text-sm font-semibold leading-none">{initial}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-gray-700" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-200">
                  <span className="text-sm font-semibold leading-none">{initial}</span>
                </span>
                <div>
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground break-all">{email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* <DropdownMenuItem>Profile</DropdownMenuItem> */}
            <DropdownMenuItem onSelect={() => navigate(role === ROLES.SUPER_ADMIN ? ROUTES.SUPER_ADMIN.SETTINGS : ROUTES.SETTINGS)}>Settings</DropdownMenuItem>
            {role === ROLES.USER && <DropdownMenuItem onSelect={() => navigate(ROUTES.HELP)}>Help &amp; Support</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <ConfirmDialog
              title="Log out"
              description="Are you sure you want to log out?"
              confirmText="Log out"
              onConfirm={logout}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Logout
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
