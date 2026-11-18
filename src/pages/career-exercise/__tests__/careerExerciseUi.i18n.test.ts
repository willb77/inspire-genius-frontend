/**
 * A10-b2: the career-exercise page labels, student/counselor error copy and note-form validation copy moved
 * into the English-only `careerExerciseUi` namespace. English must not move. The jest react-i18next mock
 * ignores defaultValue, so the only check that a default equals the English file is this one.
 * The downloadable worksheet (PDF) text is HELD in English and reads the registries directly.
 */
import fs from "node:fs"
import path from "node:path"
import type { TFunction } from "i18next"

import en from "../../../../public/locales/en/careerExerciseUi.json"
import { exerciseErrorMessage } from "../exerciseErrors"
import {
  BUCKETS,
  PILLAR_LABELS,
  REACTION_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
  WORKSHEET_SECTIONS,
  bucketLabelT,
  pillarLabelT,
  reactionLabelT,
  sectionTitle,
  stageLabel,
  statusLabel,
} from "../worksheetModel"
import { counselorErrorMessage } from "../../practitioner/career-exercise/counselorErrors"
import {
  MAX_NOTE_CHARS,
  NOTE_REQUIRED_MESSAGE,
  NOTE_TOO_LONG_MESSAGE,
  counselorNoteSchema,
  noteMessageKey,
} from "../../practitioner/career-exercise/counselorNote.schema"

function flatten(o: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, key))
    else out[key] = String(v)
  }
  return out
}
const flat = flatten(en)

/** What the app's t does with the real English file (ns prefix stripped), ignoring defaultValue. */
const enT = ((key: string, opts?: Record<string, unknown>) => {
  let v = flat[key.replace("careerExerciseUi:", "")] ?? key
  for (const [k, x] of Object.entries(opts ?? {})) v = v.replace(`{{${k}}}`, String(x))
  return v
}) as unknown as TFunction
/** A t that proves the key was used and the default is only a default. */
const tagT = ((key: string) => `«${key}»`) as unknown as TFunction
/** A t that returns the caller's defaultValue (what i18next does when the key is missing). */
const defT = ((_k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? _k) as unknown as TFunction

const used = new Set<string>()
const recordT = ((key: string, o?: { defaultValue?: string }) => {
  used.add(key.replace("careerExerciseUi:", ""))
  return o?.defaultValue ?? key
}) as unknown as TFunction

describe("registries: every English value equals the careerExerciseUi file", () => {
  it.each(WORKSHEET_SECTIONS.map((s) => [s.titleKey, s.title]))("section %s", (k, v) => expect(flat[k]).toBe(v))
  it.each(Object.entries(STAGE_LABELS))("stage.%s", (k, v) => expect(flat[`stage.${k}`]).toBe(v))
  it.each(Object.entries(STATUS_LABELS))("status.%s", (k, v) => expect(flat[`status.${k}`]).toBe(v))
  it.each(Object.entries(PILLAR_LABELS))("pillar.%s", (k, v) => expect(flat[`pillar.${k}`]).toBe(v))
  it.each(Object.entries(REACTION_LABELS))("reaction.%s", (k, v) => expect(flat[`reaction.${k}`]).toBe(v))
  it.each(BUCKETS.map((b) => [b.labelKey, b.label]))("bucket %s", (k, v) => expect(flat[k]).toBe(v))

  it("the helpers read exactly the keys the file holds, and the file holds nothing else", () => {
    WORKSHEET_SECTIONS.forEach((s) => sectionTitle(recordT, s))
    Object.keys(STAGE_LABELS).forEach((k) => stageLabel(recordT, k as keyof typeof STAGE_LABELS))
    Object.keys(STATUS_LABELS).forEach((k) => statusLabel(recordT, k as keyof typeof STATUS_LABELS))
    Object.keys(PILLAR_LABELS).forEach((k) => pillarLabelT(recordT, k))
    Object.keys(REACTION_LABELS).forEach((k) => reactionLabelT(recordT, k))
    BUCKETS.forEach((b) => bucketLabelT(recordT, b))
    exerciseErrorMessage(undefined, "f", recordT)
    for (const [status, code] of [[409, "version_conflict"], [409, "invalid_transition"]] as const)
      exerciseErrorMessage({ response: { status, data: { detail: { code } } } }, "f", recordT)
    exerciseErrorMessage({ response: { status: 403, data: {} } }, "f", recordT)
    exerciseErrorMessage({ response: { status: 404, data: {} } }, "f", recordT)
    for (const code of ["version_conflict", "no_paths", "stage_not_reached", "too_many_annotations"])
      counselorErrorMessage({ response: { status: 409, data: { detail: { code } } } }, "f", recordT)
    counselorErrorMessage({ response: { status: 403, data: {} } }, "f", recordT)
    noteKeys.forEach((m) => {
      const n = noteMessageKey(m)
      if (n) recordT(n.key)
    })
    expect([...used].sort()).toEqual(Object.keys(flat).sort())
  })
})
const noteKeys = [NOTE_REQUIRED_MESSAGE, NOTE_TOO_LONG_MESSAGE]

describe("English is identical with and without t", () => {
  const E = (status: number, detail: unknown) => ({ response: { status, data: { detail } } })
  const student = [
    E(409, { code: "version_conflict" }),
    E(409, { code: "invalid_transition", message: "m" }),
    E(409, { code: "other", message: "server says" }),
    E(409, { code: "other" }),
    E(409, { message: "bare" }),
    E(409, ["x"]),
    E(403, "not enabled"),
    E(404, "No such session"),
    E(500, "boom"),
    E(500, "  "),
    E(422, [{ msg: "x" }]),
    undefined,
    new Error("net"),
  ]
  const counselor = [
    E(409, { code: "version_conflict" }),
    E(409, { code: "no_paths" }),
    E(409, { code: "stage_not_reached" }),
    E(409, { code: "too_many_annotations" }),
    E(409, { code: "other", message: "server says" }),
    E(409, { code: "other" }),
    E(403, undefined),
    E(403, "text wins over status"),
    E(500, "boom"),
    E(422, [{ msg: "bad" }]),
    undefined,
  ]
  it.each(student.map((e, i) => [i, e]))("student state %#", (_i, e) => {
    const bare = exerciseErrorMessage(e, "FALLBACK")
    expect(exerciseErrorMessage(e, "FALLBACK", enT)).toBe(bare)
    expect(exerciseErrorMessage(e, "FALLBACK", defT)).toBe(bare)
  })
  it.each(counselor.map((e, i) => [i, e]))("counselor state %#", (_i, e) => {
    const bare = counselorErrorMessage(e, "FALLBACK")
    expect(counselorErrorMessage(e, "FALLBACK", enT)).toBe(bare)
    expect(counselorErrorMessage(e, "FALLBACK", defT)).toBe(bare)
  })
  it("labels", () => {
    for (const s of WORKSHEET_SECTIONS) expect(sectionTitle(enT, s)).toBe(s.title)
    for (const [k, v] of Object.entries(STAGE_LABELS)) expect(stageLabel(enT, k as keyof typeof STAGE_LABELS)).toBe(v)
    for (const [k, v] of Object.entries(STATUS_LABELS)) expect(statusLabel(enT, k as keyof typeof STATUS_LABELS)).toBe(v)
    for (const [k, v] of Object.entries(PILLAR_LABELS)) expect(pillarLabelT(enT, k)).toBe(v)
    expect(pillarLabelT(enT, "odd_key")).toBe("odd key")
    for (const [k, v] of Object.entries(REACTION_LABELS)) expect(reactionLabelT(enT, k)).toBe(v)
    expect(reactionLabelT(enT, "unknown")).toBe("unknown")
    for (const b of BUCKETS) expect(bucketLabelT(enT, b)).toBe(b.label)
  })
})

describe("the keys are really used (translation reaches the output)", () => {
  it("our own sentences come from t, server text and fallback do not", () => {
    expect(exerciseErrorMessage({ response: { status: 403, data: {} } }, "f", tagT)).toBe("«careerExerciseUi:studentError.forbidden»")
    expect(exerciseErrorMessage({ response: { status: 404, data: {} } }, "f", tagT)).toBe("«careerExerciseUi:studentError.notFound»")
    expect(exerciseErrorMessage({ response: { status: 409, data: { detail: { code: "version_conflict" } } } }, "f", tagT)).toBe(
      "«careerExerciseUi:studentError.version_conflict»",
    )
    expect(exerciseErrorMessage({ response: { status: 500, data: { detail: "boom" } } }, "f", tagT)).toBe("boom")
    expect(exerciseErrorMessage(undefined, "f", tagT)).toBe("f")
    expect(counselorErrorMessage({ response: { status: 409, data: { detail: { code: "no_paths" } } } }, "f", tagT)).toBe(
      "«careerExerciseUi:counselorError.no_paths»",
    )
    expect(counselorErrorMessage({ response: { status: 403, data: {} } }, "f", tagT)).toBe("«careerExerciseUi:counselorError.forbidden»")
    expect(counselorErrorMessage({ response: { status: 409, data: { detail: { code: "x", message: "srv" } } } }, "f", tagT)).toBe("srv")
  })
})

describe("counselorNoteSchema: validation and messages are unchanged", () => {
  const msg = (text: string) => {
    const r = counselorNoteSchema.safeParse({ text })
    return r.success ? "OK" : r.error.issues[0].message
  }
  it("rules", () => {
    expect(msg("")).toBe("Write a note first.")
    expect(msg("   ")).toBe("Write a note first.")
    expect(msg("a")).toBe("OK")
    expect(msg("a".repeat(MAX_NOTE_CHARS))).toBe("OK")
    expect(msg("a".repeat(MAX_NOTE_CHARS + 1))).toBe("A note is at most 2000 characters.")
  })
  it("the two messages map to their keys, anything else does not", () => {
    expect(noteMessageKey(msg(""))?.key).toBe("note.required")
    expect(noteMessageKey(msg("a".repeat(MAX_NOTE_CHARS + 1)))?.key).toBe("note.tooLong")
    expect(noteMessageKey("something else")).toBeNull()
    expect(enT("careerExerciseUi:note.tooLong", { max: MAX_NOTE_CHARS })).toBe(NOTE_TOO_LONG_MESSAGE)
    expect(flat["note.required"]).toBe(NOTE_REQUIRED_MESSAGE)
  })
})

describe("consumers resolve at render (static: nothing on the page reads a raw English registry)", () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8")
  const student = ["Worksheet.tsx", "CareerExercisePage.tsx", "BirthYearStep.tsx"]
  const counselor = "../practitioner/career-exercise/CounselorExerciseView.tsx"

  it.each(student)("%s reads no label registry and no raw title/label", (f) => {
    const src = read(f)
    expect(src).not.toMatch(/\b(STAGE_LABELS|STATUS_LABELS|PILLAR_LABELS|REACTION_LABELS)\b/)
    expect(src).not.toMatch(/\{s\.title\}/)
    expect(src).not.toMatch(/font-medium">\{label\}/)
  })

  it("every error-copy call on a page passes the page's t", () => {
    let seen = 0
    for (const f of [...student, counselor]) {
      for (const line of read(f).split("\n").filter((l) => /(exerciseErrorMessage|counselorErrorMessage)\(/.test(l) && !/^import/.test(l.trim()))) {
        seen++
        expect(line).toMatch(/\}\), t\)/)
      }
    }
    expect(seen).toBe(7)
  })

  it("the note form renders the schema message through t", () => {
    expect(read(counselor)).toMatch(/noteMessageKey\(rawFieldError\)/)
  })
})
