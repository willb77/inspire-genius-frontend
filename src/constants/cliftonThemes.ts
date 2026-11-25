/**
 * The 34 CliftonStrengths themes, spelled exactly as the agent-engine's
 * canonical list (`services/agent-engine/app/agents/coaching/frameworks/
 * clifton_interpreter.py`, `_THEME_DOMAINS`, in the monorepo). If that list
 * changes, change this one too: a saved theme the server does not recognise
 * is dropped by its interpreter.
 */
export const CLIFTON_THEMES: readonly string[] = [
  "Achiever",
  "Activator",
  "Adaptability",
  "Analytical",
  "Arranger",
  "Belief",
  "Command",
  "Communication",
  "Competition",
  "Connectedness",
  "Consistency",
  "Context",
  "Deliberative",
  "Developer",
  "Discipline",
  "Empathy",
  "Focus",
  "Futuristic",
  "Harmony",
  "Ideation",
  "Includer",
  "Individualization",
  "Input",
  "Intellection",
  "Learner",
  "Maximizer",
  "Positivity",
  "Relator",
  "Responsibility",
  "Restorative",
  "Self-Assurance",
  "Significance",
  "Strategic",
  "Woo",
] as const;

/** How many themes a CliftonStrengths "top five" holds. */
export const CLIFTON_TOP_N = 5;
