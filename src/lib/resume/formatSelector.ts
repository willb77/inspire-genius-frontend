// RWO-2 — the guide's Quick Selector (§2), for the formats the server offers.
//
// A recommendation, never a lock: the person can always pick another format.
// Only ids the server actually lists are ever recommended, so a format that is
// not built yet (Federal, Executive, Academic) is never suggested; the note says
// what to do meanwhile.

export type Situation =
  | "same_field"
  | "changing"
  | "returning"
  | "student"
  | "technical"
  | "senior"
  | "creative"
  | "federal"

export type UseWhere = "online" | "in_person" | "networking"

/**
 * RWO-3 — situations that only make sense when the server offers their format.
 * Listed only then, so a format behind its own switch (Federal) cannot surface
 * on a tier before that switch is on (Coord2's gate on FE #659).
 */
const NEEDS_OPTION: Partial<Record<Situation, string>> = { federal: "federal" }

export function situationsFor(available: string[]): { id: Situation; label: string }[] {
  return SITUATIONS.filter((s) => {
    const needs = NEEDS_OPTION[s.id]
    return !needs || available.includes(needs)
  })
}

export const SITUATIONS: { id: Situation; label: string }[] = [
  { id: "same_field", label: "Working in the same field, with a steady history" },
  { id: "changing", label: "Changing careers or industries" },
  { id: "returning", label: "Returning after incarceration or a long gap" },
  { id: "student", label: "A student or recent graduate" },
  { id: "technical", label: "In software, data, IT or engineering" },
  { id: "senior", label: "A director, VP or senior leader" },
  { id: "creative", label: "In a creative field" },
  { id: "federal", label: "Applying for a federal job (USAJOBS)" },
]

export const USES: { id: UseWhere; label: string }[] = [
  { id: "online", label: "An online application" },
  { id: "in_person", label: "Handing it to a person" },
  { id: "networking", label: "A career fair or networking event" },
]

type Rule = { pick: string; alt?: string; why: string; note?: string; unavailableNote?: string }

const RULES: Record<Situation, Rule> = {
  same_field: { pick: "reverse_chrono", alt: "hybrid", why: "Recruiters and screening systems expect it, and it shows steady growth at a glance." },
  changing: { pick: "hybrid", alt: "reverse_chrono", why: "It leads with transferable skills and keeps the dated history recruiters trust." },
  returning: { pick: "reentry", alt: "hybrid", why: "It counts training and program work as experience and describes any gap your way." },
  student: { pick: "entry_level", why: "Education, projects and activities carry the page when work history is short." },
  technical: { pick: "technical", alt: "hybrid", why: "Grouped skills and projects let a hiring manager judge depth quickly." },
  senior: {
    pick: "hybrid",
    alt: "reverse_chrono",
    why: "It puts your biggest results in the top third of page one.",
    note: "A dedicated Executive format is coming; until then, include budget, revenue and team size in your résumé.",
  },
  creative: {
    pick: "hybrid",
    alt: "reverse_chrono",
    why: "It stays readable by screening systems while leading with your strongest work.",
    note: "A designed Visual version is coming; add your portfolio link to the contact details.",
  },
  federal: {
    pick: "federal",
    alt: "reverse_chrono",
    why: "USAJOBS needs hours per week, series and grade, and month/year dates — in two pages at most.",
    note: "Paste the announcement (at least its Qualifications section) in Job description, and fill in Federal details.",
    unavailableNote:
      "The Federal format isn't switched on yet. Until it is, keep any résumé for USAJOBS to two pages — longer ones are not accepted.",
  },
}

export type Recommendation = { optionId: string; alternativeId?: string; why: string; notes: string[] }

export function recommendFormat(
  situation: Situation,
  where: UseWhere,
  hasPosting: boolean,
  available: string[],
  fallback: string,
): Recommendation {
  const rule = RULES[situation]
  const optionId = available.includes(rule.pick) ? rule.pick : fallback
  const alternativeId = rule.alt && available.includes(rule.alt) && rule.alt !== optionId ? rule.alt : undefined
  const notes: string[] = []
  if (optionId !== rule.pick && rule.unavailableNote) notes.push(rule.unavailableNote)
  else if (rule.note) notes.push(rule.note)
  if (where === "networking") notes.push("After drafting, make a Mini card for the event.")
  if (hasPosting) notes.push("Paste the job posting in Job description — it is the biggest lever on callbacks.")
  else notes.push("Applying to one job? Paste its posting in Job description to aim the draft at it.")
  return { optionId, alternativeId, why: rule.why, notes }
}

const INPUT_LABELS: Record<string, string> = {
  contact: "Contact details",
  target_role: "The job title you want",
  work_history: "Every job with title, employer and dates",
  education: "Education",
  skills: "Skills and tools",
  achievements: "2–4 achievements per role, with numbers",
  job_posting: "The job posting",
  certifications: "Certifications and licenses",
  prism_report: "Your PRISM report",
  transferable_skills: "3–5 transferable skills, each with one example",
  training_programs: "Training programs and certificates, with dates",
  disclosure_preference: "How you want any gap described",
  references: "Instructor or employer references",
  target_employers: "Employers you are aiming at",
  school: "Your school",
  graduation_date: "Graduation date (or expected)",
  program: "Program or major",
  gpa: "GPA, if 3.0 or higher",
  honors: "Honours",
  courses: "Relevant courses",
  projects: "Projects with outcomes",
  activities: "Clubs, leadership and volunteer work",
  volunteer_hours: "Volunteer hours",
  tools_and_languages: "Tools, languages and platforms",
  portfolio_links: "Portfolio or code links",
  hours_per_week: "Hours per week for each job",
  series_grade: "Series and grade for any federal job (e.g. GS-0343-09)",
  clearance: "Current security clearance",
  languages: "Language skills",
  special_programs: "Eligibility for special programs (e.g. veterans' preference)",
}

export function inputLabel(key: string): string {
  return INPUT_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
}
