// GRANT vertical — Coach roster hooks (React Query over coach.service).
//
// Follows the USE_GRANT_MOCKS pattern used in useAidIntake.ts: when the mock
// flag is on, a small module-local in-memory roster backs every query/mutation
// so the coach UI renders (and mutates) without a live backend. When it is off,
// the real service is called. Mutations invalidate the roster key so the table
// re-reads after every change.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  createCoachStudent,
  importCoachStudents,
  inviteCoachStudent,
  inviteCoachStudentsBulk,
  listCoachStudents,
  removeCoachStudent,
} from "@/services/grant/coach.service"
import type {
  BulkInviteResult,
  BulkInviteRowResult,
  CoachImportResult,
  CoachStudent,
  CoachStudentCreate,
  CoachStudentImportRow,
  InviteStudentResult,
  RemoveStudentResult,
} from "@/types/grant/coach"
import { USE_GRANT_MOCKS } from "./mocks"

export const COACH_ROSTER_KEY = ["grant", "coach", "roster"] as const

// ── Module-local mock roster ─────────────────────────────────────────────────
// Only used when USE_GRANT_MOCKS is true. Kept mutable so mock mutations reflect
// back into subsequent reads, matching the real optimistic flow.

let mockRoster: CoachStudent[] = [
  {
    id: "stu-1",
    fullName: "Maria Gonzalez",
    email: "maria.g@example.edu",
    stateOfResidence: "CA",
    gradeLevel: "12",
    status: "managed",
    completeness: 80,
    readyToSearch: true,
    updatedAt: "2026-07-08T14:20:00.000Z",
  },
  {
    id: "stu-2",
    fullName: "Devon Carter",
    email: null,
    stateOfResidence: "TX",
    gradeLevel: "11",
    status: "managed",
    completeness: 40,
    readyToSearch: false,
    updatedAt: "2026-07-06T09:05:00.000Z",
  },
  {
    id: "stu-3",
    fullName: "Aisha Patel",
    email: "aisha.patel@example.edu",
    stateOfResidence: "NY",
    gradeLevel: "College freshman",
    status: "invited",
    completeness: 100,
    readyToSearch: true,
    updatedAt: "2026-07-09T17:45:00.000Z",
  },
]

let mockSeq = mockRoster.length

function mockList(): CoachStudent[] {
  return mockRoster.map((s) => ({ ...s }))
}

function mockCreate(input: CoachStudentCreate): CoachStudent {
  mockSeq += 1
  const student: CoachStudent = {
    id: `stu-${mockSeq}`,
    fullName: [input.firstName, input.lastName].filter(Boolean).join(" ").trim(),
    email: input.email ?? null,
    stateOfResidence: input.state ?? "",
    gradeLevel: input.gradeLevel ?? null,
    status: "managed",
    completeness: 0,
    readyToSearch: false,
    updatedAt: new Date().toISOString(),
  }
  mockRoster = [student, ...mockRoster]
  return { ...student }
}

function mockImport(rows: CoachStudentImportRow[]): CoachImportResult {
  const result: CoachImportResult = { created: 0, duplicates: 0, errors: 0, results: [] }
  rows.forEach((row, i) => {
    const rowNum = i + 1
    if (!row.first_name?.trim()) {
      result.errors += 1
      result.results.push({ row: rowNum, status: "error", message: "Missing first name" })
      return
    }
    const created = mockCreate({
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      state: row.state,
      gradeLevel: row.grade_level,
      intendedField: row.intended_field,
      householdIncomeRange: row.household_income_range,
      dob: row.dob,
    })
    result.created += 1
    result.results.push({
      row: rowNum,
      status: "created",
      studentId: created.id,
      name: created.fullName,
    })
  })
  return result
}

function mockRemove(id: string): RemoveStudentResult {
  mockRoster = mockRoster.filter((s) => s.id !== id)
  return { removed: true }
}

function mockInvite(id: string): InviteStudentResult {
  const student = mockRoster.find((s) => s.id === id)
  if (!student) return { status: "noop", studentId: id, message: "Student not found" }
  if (!student.email) return { status: "noop", studentId: id, message: "No email on file" }
  student.status = "invited"
  return { status: "invited", studentId: id, message: "Invitation sent" }
}

function mockBulkInvite(studentIds: string[]): BulkInviteResult {
  const results: BulkInviteRowResult[] = studentIds.map((id) => {
    const student = mockRoster.find((s) => s.id === id)
    if (!student) return { studentId: id, status: "error", message: "Student not found" }
    if (student.status === "linked")
      return { studentId: id, status: "noop", message: "Already linked" }
    if (!student.email) return { studentId: id, status: "skipped", message: "No email on file" }
    student.status = "invited"
    return { studentId: id, status: "invited", message: "Invitation sent" }
  })
  const converted = results.filter((r) => r.status === "invited" || r.status === "linked").length
  const skipped = results.filter((r) => r.status === "skipped" || r.status === "noop").length
  const errors = results.filter((r) => r.status === "error" || r.status === "forbidden").length
  return { converted, skipped, errors, results }
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** The coach's managed roster (GET /coach/students), mock-backed when enabled. */
export function useCoachRoster() {
  return useQuery<CoachStudent[], AxiosError>({
    queryKey: COACH_ROSTER_KEY,
    queryFn: () => (USE_GRANT_MOCKS ? Promise.resolve(mockList()) : listCoachStudents()),
  })
}

/** Add one student to the roster. */
export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation<CoachStudent, AxiosError, CoachStudentCreate>({
    mutationFn: (input) =>
      USE_GRANT_MOCKS ? Promise.resolve(mockCreate(input)) : createCoachStudent(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_ROSTER_KEY })
    },
  })
}

/** Bulk-import parsed CSV rows. */
export function useImportStudents() {
  const qc = useQueryClient()
  return useMutation<CoachImportResult, AxiosError, CoachStudentImportRow[]>({
    mutationFn: (rows) =>
      USE_GRANT_MOCKS ? Promise.resolve(mockImport(rows)) : importCoachStudents(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_ROSTER_KEY })
    },
  })
}

/** Remove a student from the roster. */
export function useRemoveStudent() {
  const qc = useQueryClient()
  return useMutation<RemoveStudentResult, AxiosError, string>({
    mutationFn: (id) => (USE_GRANT_MOCKS ? Promise.resolve(mockRemove(id)) : removeCoachStudent(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_ROSTER_KEY })
    },
  })
}

/**
 * Invite a student to their own IG login. Optimistically flips the row's badge
 * to "invited" while the request is in flight, rolling back on error.
 */
export function useInviteStudent() {
  const qc = useQueryClient()
  return useMutation<
    InviteStudentResult,
    AxiosError,
    { id: string; keepCoachAccess: boolean },
    { prev?: CoachStudent[] }
  >({
    mutationFn: ({ id, keepCoachAccess }) =>
      USE_GRANT_MOCKS ? Promise.resolve(mockInvite(id)) : inviteCoachStudent(id, keepCoachAccess),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: COACH_ROSTER_KEY })
      const prev = qc.getQueryData<CoachStudent[]>(COACH_ROSTER_KEY)
      qc.setQueryData<CoachStudent[]>(COACH_ROSTER_KEY, (old) =>
        old?.map((s) => (s.id === id ? { ...s, status: "invited" } : s))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(COACH_ROSTER_KEY, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: COACH_ROSTER_KEY })
    },
  })
}

/** Invite many students to their own IG login in one request. */
export function useBulkInviteStudents() {
  const qc = useQueryClient()
  return useMutation<
    BulkInviteResult,
    AxiosError,
    { studentIds: string[]; keepCoachAccess: boolean }
  >({
    mutationFn: ({ studentIds, keepCoachAccess }) =>
      USE_GRANT_MOCKS
        ? Promise.resolve(mockBulkInvite(studentIds))
        : inviteCoachStudentsBulk(studentIds, keepCoachAccess),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COACH_ROSTER_KEY })
    },
  })
}
