import { CLIFTON_THEMES } from "@/constants/cliftonThemes";
import {
  canonicalTheme,
  cliftonScoreRows,
  moveRow,
  reviewProblem,
  toConfirmRows,
  toReviewRows,
  topFiveProblem,
} from "@/components/shared/settings/assessmentReview";

test("the theme list is the server's 34, each once", () => {
  expect(CLIFTON_THEMES).toHaveLength(34);
  expect(new Set(CLIFTON_THEMES.map((t) => t.toLowerCase())).size).toBe(34);
  expect(CLIFTON_THEMES).toContain("Self-Assurance");
  expect(CLIFTON_THEMES).toContain("Woo");
});

test("canonicalTheme matches case and spacing, and refuses anything else", () => {
  expect(canonicalTheme("  WOO ")).toBe("Woo");
  expect(canonicalTheme("self-assurance")).toBe("Self-Assurance");
  expect(canonicalTheme("Banana")).toBeNull();
  expect(canonicalTheme("")).toBeNull();
  expect(canonicalTheme(undefined)).toBeNull();
});

test("topFiveProblem", () => {
  expect(topFiveProblem(["Achiever", "Learner", "Input", "Ideation", "Woo"])).toBeNull();
  expect(topFiveProblem(["Achiever", "Learner", "Input", "Ideation", ""])).toBe("incomplete");
  expect(topFiveProblem(["Achiever", "Learner", "Input", "Ideation"])).toBe("incomplete");
  expect(topFiveProblem(["Achiever", "achiever", "Input", "Ideation", "Woo"])).toBe("duplicate");
  expect(topFiveProblem(["Achiever", "Learner", "Input", "Ideation", "Banana"])).toBe("unknown");
});

test("cliftonScoreRows ranks from 1 in the given order", () => {
  expect(cliftonScoreRows(["woo", "Input"]).map((r) => [r.dimension, r.rank, r.category])).toEqual([
    ["Woo", 1, "Themes"],
    ["Input", 2, "Themes"],
  ]);
});

test("non-Clifton review rows pass through unchanged and confirm drops the flag only", () => {
  const rows = [{ category: "DISC", dimension: "D", score_numeric: 5 }];
  const review = toReviewRows("DISC", rows);
  expect(toConfirmRows("DISC", review)).toEqual(rows);
});

test("reviewProblem", () => {
  expect(reviewProblem("DISC", [], false)).toBe("empty");
  expect(reviewProblem("MBTI", [], true)).toBeNull();
  const unknown = toReviewRows("CLIFTON", [{ category: "Themes", dimension: "Banana", rank: 1 }]);
  expect(reviewProblem("CLIFTON", unknown, false)).toBe("unknown");
});

test("moveRow keeps out-of-range moves as they are", () => {
  expect(moveRow([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  expect(moveRow([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  expect(moveRow([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
});
