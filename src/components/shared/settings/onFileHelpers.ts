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
import type { ProfileAssessmentView, ProfileMe } from "@/types/profile/profile-types";

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

/** How many entries for a framework are older than the current one. */
export function earlierCount(total: number | null | undefined): number {
  return typeof total === "number" && total > 1 ? total - 1 : 0;
}
