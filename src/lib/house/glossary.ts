/**
 * House-style words: one plain name for each thing.
 *
 * Internal names (agent code names, engineering terms) reach people all over
 * the app. This map is the single source for the plain word to show instead.
 * Pages adopt it as their area's house-style switch turns on; nothing reads it
 * yet.
 *
 * Deliberately NOT here: customer-facing programme and brand names (GRANT,
 * Lumen, Honor, Meridian as the coach's own name inside chat). Customers have
 * already seen those, and renaming them is an owner's decision.
 */

export const BUTTON_WORDS = {
  save: "Save",
  cancel: "Cancel",
  close: "Close",
  next: "Next",
  back: "Back",
  finish: "Finish",
  delete: "Delete",
  tryAgain: "Try again",
  logOut: "Log out",
} as const

/** Internal or inconsistent term (lower-case) → the word people see. */
export const GLOSSARY: Readonly<Record<string, string>> = {
  // Agent code names → the coach
  aura: "your coach",
  nova: "your coach",
  forge: "your coach",
  chronicle: "your coach",
  echo: "your coach",
  summit: "your coach",
  maven: "your coach",
  sage: "your coach",
  alex: "your coach",
  ascend: "your coach",
  atlas: "your coach",
  compass: "your coach",
  agent: "coach",
  mentor: "coach",
  "ask meridian": "Help",

  // Interviews
  "role play": "Practice an interview",
  "interview practice": "Practice an interview",
  "interview prep": "Practice an interview",
  rehearse: "Practice an interview",

  // Job profiles
  "job dna": "Job profile",
  "job blueprint": "Job profile",
  "career blueprint": "Job profile",
  "blueprint a role": "Job profile",
  "career fit": "Jobs that fit me",
  "job fit": "Jobs that fit me",

  // Goals
  "goals studio": "My goals",
  provisional: "Draft",
  seeded: "Suggested",
  ratified: "Coach approved",

  // People
  "member oversight": "Shared with me",
  "team import": "Add people",
  "bulk import": "Add people",
  "bulk user import": "Add people",

  // Knowledge handover
  "knowledge continuity studio": "Knowledge handover",
  kvi: "trust %",
  kri: "risk",
  "bus factor": "How many others could do this job?",

  // Engineering surfaces
  "rlhf training": "Coach feedback review",
  rtbf: "Data deletion requests",
  observability: "AI usage & health",
  explainability: "Why the AI answered",
  hitl: "Approvals",

  // Sign-in
  "magic link": "Sign-in link",
  "log in": "Sign in",
  login: "Sign in",
  logout: "Log out",
}

/**
 * The plain word for a term, or the term itself when there is no entry.
 * Matching ignores case and surrounding whitespace.
 */
export function plain(term: string): string {
  return GLOSSARY[term.trim().toLowerCase()] ?? term
}
