import type {
  AnalysisPart,
  AskResult,
  ComparisonPart,
  ScenarioPart,
  StarterQuestion,
  StarterQuestions,
} from '@/types/character-lab'

/**
 * Translating the team-studio wire shape into the shape the shared panels take.
 *
 * The panels are typed against the CHARACTER LAB's response types, because that
 * is the backend they were first written for. `/v1/agents/team-studio` answers
 * a different shape — every endpoint returns `{markdown, notice}` (plus
 * `part`/`parts` where the work is split) rather than Character Lab's
 * `analysis` / `comparison` / `behaviour` / `questions`.
 *
 * Nothing bridged the two, and TypeScript could not object: the service
 * declared `agentApi.post<Envelope<ComparisonPart>>(...)`, which is an
 * assertion about a response, not a check of one. So `tsc` passed, the unit
 * tests passed against hand-written fixtures, the request returned 200 — and
 * the panel read `comparison` off a body that only carried `markdown`, and
 * rendered nothing. On staging-b on 2026-09-03 that was 13 consecutive 200s
 * whose prose was generated, paid for, and dropped on the floor.
 *
 * `ports.ts` always said this file should exist: "Each adapter does its own
 * translation, and the panel never learns which." It simply was never written.
 *
 * These functions are pure and take the wire body, so they can be tested
 * against a REAL captured response rather than an invented one — which is the
 * specific gap that let the mismatch ship.
 */

/**
 * What `/v1/agents/team-studio/*` actually returns.
 *
 * Named for the wire, not for the panel, so that a future change on either side
 * shows up here as a mismatch instead of being silently asserted away.
 */
export type TeamStudioWire = {
  markdown?: string
  notice?: string
  /** Present on the split endpoints (`/analyse`, `/compare`) only. */
  part?: number
  parts?: number
}

/**
 * Sections the server did not send.
 *
 * The team-studio endpoints do not report their section titles — the server
 * owns the grouping and returns the rendered markdown. The panels do not read
 * this field; it exists on the Character Lab type. An empty array says "not
 * supplied", where inventing titles here would put headings on an export that
 * no response produced.
 */
function notSupplied(): string[] {
  // A fresh array per result rather than one shared constant: nothing reads
  // this field today, and a shared array that later gets pushed to would leak
  // one result's headings into every other.
  return []
}

export function toAnalysisPart(wire: TeamStudioWire, name: string): AnalysisPart {
  return {
    notice: wire.notice ?? '',
    name,
    part: wire.part ?? 0,
    parts: wire.parts ?? 1,
    sections: notSupplied(),
    analysis: wire.markdown ?? '',
  }
}

export function toComparisonPart(wire: TeamStudioWire, names: string[]): ComparisonPart {
  return {
    notice: wire.notice ?? '',
    part: wire.part ?? 0,
    parts: wire.parts ?? 1,
    sections: notSupplied(),
    names,
    comparison: wire.markdown ?? '',
  }
}

export function toScenarioPart(
  wire: TeamStudioWire,
  focus: string,
  names: string[],
): ScenarioPart {
  return {
    notice: wire.notice ?? '',
    focus,
    // The server sends no heading for a scenario read; the panel supplies its
    // own from the cast. Empty rather than a guess.
    heading: '',
    names,
    behaviour: wire.markdown ?? '',
  }
}

export function toAskResult(
  wire: TeamStudioWire,
  question: string,
  names: string[],
): AskResult {
  return {
    notice: wire.notice ?? '',
    question,
    names,
    answer: wire.markdown ?? '',
  }
}

/** A markdown list item: `- foo`, `* foo`, `+ foo`, `1. foo`, `2) foo`. */
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.+?)\s*$/
/** A trailing parenthetical with no nesting — the named score the prompt asks for. */
const TRAILING_PAREN = /^(.*\S)\s*\(([^()]+)\)\s*$/

/** `**bold**` / `*em*` / `__bold__` markers, which the panel renders as plain text. */
function stripEmphasis(s: string): string {
  return s.replace(/\*\*/g, '').replace(/__/g, '').replace(/(^|\s)\*(\S)/g, '$1$2').trim()
}

/**
 * Split one markdown bullet into the question and the reason it is worth asking.
 *
 * The server is asked for questions "grounded in a NAMED score, and say which
 * one in parentheses", so the trailing parenthetical is the `why` the panel
 * renders underneath. A line that does not match that shape is kept WHOLE as
 * the question with no `why`, rather than being dropped or split on a guess —
 * the panel already treats `why` as optional.
 */
export function parseStarterQuestion(line: string): StarterQuestion {
  const text = stripEmphasis(line)
  const m = TRAILING_PAREN.exec(text)
  if (!m) return { question: text, why: '' }
  return { question: m[1].trim(), why: m[2].trim() }
}

/**
 * The `/questions` endpoint returns a markdown list; the panel renders objects.
 *
 * Only list items are taken. A preamble line, a trailing note, or a blank line
 * is not a question, and turning one into a clickable prompt would put words in
 * the manager's mouth that the model did not offer as a question.
 */
export function toStarterQuestions(wire: TeamStudioWire, names: string[]): StarterQuestions {
  const questions = (wire.markdown ?? '')
    .split('\n')
    .map((line) => LIST_ITEM.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => parseStarterQuestion(m[1]))
    .filter((q) => q.question.length > 0)

  return { notice: wire.notice ?? '', names, questions }
}
