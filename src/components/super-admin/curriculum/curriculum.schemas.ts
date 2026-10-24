import { z } from "zod"
import { CREDENTIALS, RULES, TERMS } from "@/types/curriculum"
import type { CourseInput, ProgramInput, RequisiteKind, RequirementRule } from "@/types/curriculum"

/**
 * Form schemas for Administration → Curriculum.
 *
 * They catch the obvious mistakes before a round trip and mirror the field
 * rules in the agent-engine's `app/tools/curriculum/validate.py`. The SERVER is
 * authoritative: unknown codes, cycles and credit totals are checked there and
 * nowhere else, and its refusal is rendered as it comes back.
 *
 * Values stay strings in the form (inputs produce strings); `toCourseInput` /
 * `toProgramInput` convert to the request body.
 */

const MAX_CODE = 40
const MAX_TITLE = 300
const MAX_TEXT = 5000

const NUMBER = /^\d+(\.\d+)?$/
const GRADE = /^([A-Da-d][+-]?|[Pp])$/

const code = (label: string) =>
  z.string().trim().min(1, `${label} is required`).max(MAX_CODE, `${label} is at most ${MAX_CODE} characters`)

const title = z.string().trim().min(1, "Title is required").max(MAX_TITLE, `Title is at most ${MAX_TITLE} characters`)

const optionalText = z.string().max(MAX_TEXT, `At most ${MAX_TEXT} characters`)

const credits = (label: string, max: number) =>
  z
    .string()
    .trim()
    .regex(NUMBER, `${label} must be a number of 0 or more`)
    .refine((v) => !NUMBER.test(v) || Number(v) <= max, `${label} must be at most ${max}`)

export const institutionSchema = z.object({
  name: z.string().trim().min(1, "A school needs a name").max(MAX_TITLE, `At most ${MAX_TITLE} characters`),
  unitid: z
    .string()
    .trim()
    .regex(/^(\d{6})?$/, "UNITID is the 6-digit IPEDS id"),
  opeid: z
    .string()
    .trim()
    .regex(/^(\d{6,8})?$/, "OPEID is 6 to 8 digits"),
})
export type InstitutionValues = z.input<typeof institutionSchema>

/** `2026` or `2026-2027` (consecutive years) — the server's own rule. */
export function isCatalogYear(raw: string): boolean {
  const m = /^(\d{4})(?:-(\d{4}))?$/.exec(raw.trim())
  if (!m) return false
  return m[2] === undefined || Number(m[2]) === Number(m[1]) + 1
}

export const catalogYearSchema = z.object({
  catalogYear: z
    .string()
    .trim()
    .refine(isCatalogYear, "The catalog year is 2026 or 2026-2027 (consecutive years)"),
})
export type CatalogYearValues = z.input<typeof catalogYearSchema>

const requisiteSchema = z.object({
  code: z.string().trim().min(1, "Pick a course from the catalog"),
  kind: z.enum(["prereq", "coreq"]),
  altGroup: z
    .string()
    .trim()
    .regex(/^(\d{1,4})?$/, "Alternative group is a whole number"),
  minGrade: z
    .string()
    .trim()
    .regex(/^(([A-Da-d][+-]?)|[Pp])?$/, "Minimum grade is a letter grade (A–D, +/−) or P"),
})

export const courseSchema = z.object({
  code: code("Course code"),
  title,
  credits: credits("Credits", 30),
  description: optionalText,
  termsOffered: z.array(z.enum(TERMS)),
  prerequisites: z.array(requisiteSchema),
})
export type CourseValues = z.input<typeof courseSchema>

const groupSchema = z
  .object({
    groupName: z.string().trim().min(1, "A group needs a name").max(MAX_TITLE),
    rule: z.enum(RULES as [RequirementRule, ...RequirementRule[]]),
    n: z.string().trim(),
    minCredits: z.string().trim(),
    courses: z.array(z.string()),
  })
  .superRefine((g, ctx) => {
    if (g.rule === "required" && g.courses.length === 0) {
      ctx.addIssue({ code: "custom", path: ["courses"], message: "A 'required' group lists at least one course" })
    }
    if (g.rule === "choose_n") {
      const n = /^\d+$/.test(g.n) ? Number(g.n) : 0
      if (n < 1) ctx.addIssue({ code: "custom", path: ["n"], message: "'Choose n' needs n of 1 or more" })
      else if (n > g.courses.length)
        ctx.addIssue({
          code: "custom",
          path: ["n"],
          message: `Choose ${n} from ${g.courses.length} listed course(s) is impossible`,
        })
    }
    if (g.rule === "min_credits" && !(NUMBER.test(g.minCredits) && Number(g.minCredits) > 0)) {
      ctx.addIssue({ code: "custom", path: ["minCredits"], message: "'Minimum credits' needs a floor above 0" })
    }
  })

export const programSchema = z.object({
  code: code("Program code"),
  title,
  credential: z.enum(CREDENTIALS),
  totalCredits: credits("Total credits", 400),
  cipCode: z.string().trim().max(MAX_CODE),
  description: optionalText,
  requirements: z.array(groupSchema),
})
export type ProgramValues = z.input<typeof programSchema>

export const importSchema = z
  .object({
    coursesCsv: z.string().max(2_000_000, "The courses file is too large"),
    programsCsv: z.string().max(2_000_000, "The programs file is too large"),
  })
  .refine((v) => v.coursesCsv.trim() !== "" || v.programsCsv.trim() !== "", {
    message: "Paste or load at least one CSV file",
    path: ["coursesCsv"],
  })
export type ImportValues = z.input<typeof importSchema>

const blankToNull = (v: string | undefined) => {
  const t = (v ?? "").trim()
  return t === "" ? null : t
}

export function toCourseInput(v: CourseValues): CourseInput {
  return {
    code: v.code.trim(),
    title: v.title.trim(),
    credits: Number(v.credits),
    description: blankToNull(v.description),
    termsOffered: [...v.termsOffered],
    prerequisites: v.prerequisites.map((p) => ({
      code: p.code.trim(),
      kind: p.kind as RequisiteKind,
      altGroup: p.altGroup.trim() === "" ? null : Number(p.altGroup),
      minGrade: GRADE.test(p.minGrade.trim()) ? p.minGrade.trim().toUpperCase() : null,
    })),
  }
}

export function toProgramInput(v: ProgramValues): ProgramInput {
  return {
    code: v.code.trim(),
    title: v.title.trim(),
    credential: v.credential,
    totalCredits: Number(v.totalCredits),
    cipCode: blankToNull(v.cipCode),
    description: blankToNull(v.description),
    requirements: v.requirements.map((g) => ({
      groupName: g.groupName.trim(),
      rule: g.rule,
      n: g.rule === "choose_n" ? Number(g.n) : null,
      minCredits: g.rule === "min_credits" ? Number(g.minCredits) : null,
      courses: [...g.courses],
    })),
  }
}

export const EMPTY_COURSE: CourseValues = {
  code: "",
  title: "",
  credits: "",
  description: "",
  termsOffered: [],
  prerequisites: [],
}

export const EMPTY_PROGRAM: ProgramValues = {
  code: "",
  title: "",
  credential: "AAS",
  totalCredits: "",
  cipCode: "",
  description: "",
  requirements: [],
}

export const COURSES_CSV_TEMPLATE =
  "code,title,credits,description,terms_offered,prerequisites,corequisites\n" +
  "MAT 121,Algebra and Trigonometry I,3,,fall|spring,,\n" +
  "MAT 122,Algebra and Trigonometry II,3,,spring,MAT 121:C,\n"

export const PROGRAMS_CSV_TEMPLATE =
  "program_code,program_title,credential,total_credits,cip_code,description,group,rule,n,min_credits,courses\n" +
  "A25590,Example Program,AAS,6,,,Core,required,,,MAT 121|MAT 122\n"
