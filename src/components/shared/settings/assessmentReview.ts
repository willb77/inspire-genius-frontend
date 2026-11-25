/**
 * Pure helpers for the Settings "Other Assessments" card: the rows the
 * backend's `ScoreIn` accepts (it requires `category`), the CliftonStrengths
 * top-five rules, and the review step of a report upload.
 */
import { CLIFTON_THEMES, CLIFTON_TOP_N } from "@/constants/cliftonThemes";
import type { ImportScoreRow } from "@/types/profile/profile-types";

/** Score rows for a numeric framework, in the shape `POST /me/assessments` validates. */
export function numericScoreRows(
  category: string,
  pairs: Record<string, number>,
): ImportScoreRow[] {
  return Object.entries(pairs).map(([dimension, score]) => ({
    category,
    dimension,
    score_numeric: score,
  }));
}

/** The canonical spelling of a theme name, or `null` when it is not one of the 34. */
export function canonicalTheme(name: string | null | undefined): string | null {
  const key = (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!key) return null;
  return CLIFTON_THEMES.find((t) => t.toLowerCase() === key) ?? null;
}

export type TopFiveProblem = "incomplete" | "duplicate" | "unknown";

/** Why a set of five picks cannot be saved, or `null` when it can. */
export function topFiveProblem(picks: readonly string[]): TopFiveProblem | null {
  const chosen = picks.map((p) => p.trim()).filter(Boolean);
  if (chosen.length < CLIFTON_TOP_N || picks.length !== CLIFTON_TOP_N) return "incomplete";
  if (chosen.some((p) => canonicalTheme(p) === null)) return "unknown";
  const seen = new Set(chosen.map((p) => p.toLowerCase()));
  if (seen.size !== chosen.length) return "duplicate";
  return null;
}

/** Ranked theme rows (rank 1 = strongest) for a CliftonStrengths save. */
export function cliftonScoreRows(themes: readonly string[]): ImportScoreRow[] {
  return themes.map((theme, i) => {
    const name = canonicalTheme(theme) ?? theme.trim();
    return {
      category: "Themes",
      dimension: name,
      score_text: name,
      score_type: "Rank",
      rank: i + 1,
    };
  });
}

/** One editable row in the upload review. */
export type ReviewRow = ImportScoreRow & {
  /** For CLIFTON: false when the parsed theme is not one of the 34. */
  known: boolean;
};

/**
 * Turn a preview's rows into review rows. For CLIFTON the rows are put in
 * rank order, theme names are mapped to their canonical spelling where they
 * match one, and the list is trimmed to the top five. Other frameworks keep
 * their rows as parsed.
 */
export function toReviewRows(framework: string, rows: readonly ImportScoreRow[]): ReviewRow[] {
  if (framework !== "CLIFTON") return rows.map((r) => ({ ...r, known: true }));
  const ranked = [...rows].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER),
  );
  return ranked.slice(0, CLIFTON_TOP_N).map((r) => {
    const name = canonicalTheme(r.dimension ?? r.score_text);
    const theme = name ?? (r.dimension || r.score_text || "").trim();
    return {
      category: "Themes",
      dimension: theme,
      score_text: theme,
      score_type: "Rank",
      rank: r.rank ?? null,
      known: name !== null,
    };
  });
}

/** The rows confirm receives: for CLIFTON re-ranked 1..n in the order shown. */
export function toConfirmRows(framework: string, rows: readonly ReviewRow[]): ImportScoreRow[] {
  return rows.map((row, i) => {
    const { known, ...r } = row;
    void known; // review-only flag; the server's ScoreIn does not take it
    return framework === "CLIFTON" ? { ...r, rank: i + 1 } : r;
  });
}

/** Why the review cannot be saved yet, or `null`. */
export function reviewProblem(
  framework: string,
  rows: readonly ReviewRow[],
  hasTyping: boolean,
): "empty" | "unknown" | null {
  if (rows.length === 0 && !hasTyping) return "empty";
  if (framework === "CLIFTON" && rows.some((r) => !r.known)) return "unknown";
  return null;
}

/** Move one row up (-1) or down (+1); out-of-range moves return the same list. */
export function moveRow<T>(rows: readonly T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (index < 0 || index >= rows.length || to < 0 || to >= rows.length) return [...rows];
  const next = [...rows];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
