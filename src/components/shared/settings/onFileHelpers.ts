/**
 * What Settings → Other Assessments shows as "on file" (TDS F-W7-1).
 *
 * Walk W7 saved a CliftonStrengths top five twice and the card never showed
 * either: it made no read at all. The source of truth is `GET /v1/profile/me`
 * `assessments`, the latest AUTHORITATIVE result per framework, which is what
 * Meridian and every other reader use. A newer entry for the same framework
 * supersedes the older one; it does not add to it.
 *
 * PRISM is left out here: it has its own "Replace PRISM data" row and flow.
 */
import type {
  AssessmentHistoryItem,
  PendingImport,
  ProfileAssessmentView,
  ProfileMe,
} from "@/types/profile/profile-types";

/** Brand names: shown as written in every language. */
const FRAMEWORK_LABELS: Record<string, string> = {
  DISC: "DISC",
  BIG_FIVE: "Big Five",
  MBTI: "MBTI",
  CLIFTON: "CliftonStrengths",
};

/** The card's order; anything else follows alphabetically. */
const ORDER = ["DISC", "BIG_FIVE", "MBTI", "CLIFTON"];

export function frameworkKey(framework: string | null | undefined): string {
  return String(framework ?? "").trim().toUpperCase();
}

export function frameworkLabel(framework: string): string {
  const key = frameworkKey(framework);
  return FRAMEWORK_LABELS[key] ?? framework;
}

/** The person's current results, PRISM excluded, in card order. */
export function onFileAssessments(profile: ProfileMe | undefined): ProfileAssessmentView[] {
  const list = (profile?.assessments ?? []).filter(
    (a) => a && frameworkKey(a.framework) && frameworkKey(a.framework) !== "PRISM",
  );
  const rank = (fw: string): number => {
    const i = ORDER.indexOf(frameworkKey(fw));
    return i === -1 ? ORDER.length : i;
  };
  return [...list].sort(
    (a, b) => rank(a.framework) - rank(b.framework) || frameworkKey(a.framework).localeCompare(frameworkKey(b.framework)),
  );
}

/** The current result for one framework, if the person has one. */
export function findOnFile(
  profile: ProfileMe | undefined,
  framework: string,
): ProfileAssessmentView | undefined {
  const key = frameworkKey(framework);
  if (!key) return undefined;
  return onFileAssessments(profile).find((a) => frameworkKey(a.framework) === key);
}

export type SourceKind = "entered" | "report" | "other";

export function sourceKind(source: string | null | undefined): SourceKind {
  if (source === "user_input") return "entered";
  if (source === "file_upload") return "report";
  return "other";
}

const fmtNumber = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * The result in one line: CliftonStrengths' ranked themes, MBTI's type, the
 * dimension scores otherwise. "" when the server sent nothing readable.
 */
export function resultText(view: ProfileAssessmentView): string {
  const scores = view.top_scores ?? [];
  const key = frameworkKey(view.framework);
  if (key === "CLIFTON") {
    return [...scores]
      .filter((s) => s.dimension)
      .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 5)
      .map((s) => s.dimension)
      .join(", ");
  }
  if (view.typing) return view.typing;
  return scores
    .filter((s) => s.dimension)
    .map((s) => {
      if (typeof s.score_numeric === "number") return `${s.dimension} ${fmtNumber(s.score_numeric)}`;
      if (s.score_text) return `${s.dimension}: ${s.score_text}`;
      return s.dimension;
    })
    .join(" · ");
}

/** "Nov 25, 2026" in the reader's language; the raw value if unparseable. */
export function formatAssessedDate(iso: string, language?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(language || undefined, { day: "numeric", month: "short", year: "numeric" });
}


// ── TDS F-W7-1 Part B: the entry behind a line, and whether it can be removed ──

/** Sources the person made themselves: the only ones the server will remove. */
const OWNER_REMOVABLE_SOURCES = new Set(["user_input", "file_upload"]);

const time = (iso: string): number => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
};

/** History rows for one framework that still count (a removed one does not). */
export function activeEntries(
  items: AssessmentHistoryItem[] | null | undefined,
  framework: string,
): AssessmentHistoryItem[] {
  const key = frameworkKey(framework);
  return (items ?? []).filter(
    (i) => i && frameworkKey(i.framework) === key && i.is_authoritative !== false,
  );
}

/**
 * The history row behind a framework's "On file" line: the latest one that
 * still counts, which is the row `GET /me` reports. `GET /me` carries no id,
 * so this is where the id to remove comes from.
 */
export function currentEntry(
  items: AssessmentHistoryItem[] | null | undefined,
  framework: string,
): AssessmentHistoryItem | undefined {
  return [...activeEntries(items, framework)].sort(
    (a, b) => time(b.assessed_at) - time(a.assessed_at),
  )[0];
}

/** Entries that still count, other than the current one. A removed entry is not "earlier". */
export function activeEarlierCount(
  items: AssessmentHistoryItem[] | null | undefined,
  framework: string,
): number {
  return Math.max(activeEntries(items, framework).length - 1, 0);
}

/**
 * Mirrors the server's guards so the button only shows where it can work:
 * still counts, entered or uploaded by the person, never PRISM. The server
 * (DELETE /v1/profile/me/assessments/{id}) is the real gate.
 */
export function isRemovable(entry: AssessmentHistoryItem | null | undefined): boolean {
  if (!entry || !entry.id) return false;
  if (entry.is_authoritative === false) return false;
  if (frameworkKey(entry.framework) === "PRISM") return false;
  return OWNER_REMOVABLE_SOURCES.has(entry.source);
}

type ErrorShape = { response?: { status?: number; data?: { detail?: unknown } } };

/** The HTTP status and the server's `detail` from a failed remove, when present. */
export function removeErrorInfo(err: unknown): { status?: number; detail?: string } {
  const res = (err as ErrorShape | null)?.response;
  const detail = res?.data?.detail;
  return { status: res?.status, detail: typeof detail === "string" && detail ? detail : undefined };
}

// ── TDS A4: results a practitioner sent, waiting for the person ──

/** A held result in the same one-line form as an "On file" line. */
export function pendingResultText(item: Pick<PendingImport, "framework" | "scores">): string {
  return resultText({
    framework: item.framework,
    assessed_at: "",
    source: PRACTITIONER_IMPORT_SOURCE,
    top_scores: item.scores ?? [],
  });
}

/** The server's source for a practitioner's import (backend `PRACTITIONER_IMPORT_SOURCE`). */
export const PRACTITIONER_IMPORT_SOURCE = "practitioner_import";

/**
 * Whether a failed read of the waiting list means the route is not on this
 * tier yet. The route itself never answers 404 (it lists the caller's own
 * rows), so a 404 can only mean an engine without it: the list is then left
 * out rather than putting an error on everyone's Settings. Any other failure
 * is shown.
 */
export function pendingRouteMissing(err: unknown): boolean {
  return removeErrorInfo(err).status === 404;
}
