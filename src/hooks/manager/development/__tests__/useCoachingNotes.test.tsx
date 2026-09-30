/**
 * The notes hooks (TDS-2). Three things are pinned:
 *
 *  - the list unwraps `{notes: [...]}` and returns [] rather than undefined, so
 *    a panel never has to distinguish "no envelope" from "no notes";
 *  - a write that the server acknowledged without a row is a FAILURE, not a
 *    silent success — an empty envelope must not look like a saved note;
 *  - a successful write invalidates the notes key, so the tab that wrote it and
 *    the tab that reads it cannot disagree.
 */
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"

const listCoachingNotes = jest.fn()
const updateCoachingNote = jest.fn()
const deleteCoachingNote = jest.fn()

jest.mock("@/services/manager/development/growthService", () => ({
  listCoachingNotes: (id: string) => listCoachingNotes(id),
  updateCoachingNote: (id: string, noteId: string, input: unknown) =>
    updateCoachingNote(id, noteId, input),
  deleteCoachingNote: (id: string, noteId: string) => deleteCoachingNote(id, noteId),
}))

import {
  useDeleteCoachingNote,
  useMemberNotes,
  useUpdateCoachingNote,
} from "../useCoachingNotes"
import { developmentKeys } from "../queryKeys"

let client: QueryClient
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
})

it("returns the notes the server sent, in the order it sent them", async () => {
  listCoachingNotes.mockResolvedValue({
    data: { data: { notes: [{ id: "n-2" }, { id: "n-1" }] } },
  })
  const { result } = renderHook(() => useMemberNotes("m-1"), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.map((n) => n.id)).toEqual(["n-2", "n-1"])
})

it("returns an empty list, not undefined, when the envelope carries nothing", async () => {
  listCoachingNotes.mockResolvedValue({ data: {} })
  const { result } = renderHook(() => useMemberNotes("m-1"), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual([])
})

it("does not ask for the notes of a member that isn't there yet", () => {
  renderHook(() => useMemberNotes(undefined), { wrapper })
  expect(listCoachingNotes).not.toHaveBeenCalled()
})

it("an edit that came back empty fails rather than reporting a save", async () => {
  updateCoachingNote.mockResolvedValue({ data: { data: null } })
  const { result } = renderHook(() => useUpdateCoachingNote("m-1"), { wrapper })
  await expect(
    result.current.mutateAsync({ noteId: "n-1", input: { body: "x" } }),
  ).rejects.toThrow(/not saved/i)
})

it("a successful edit invalidates the notes list", async () => {
  updateCoachingNote.mockResolvedValue({ data: { data: { id: "n-1" } } })
  const spy = jest.spyOn(client, "invalidateQueries")
  const { result } = renderHook(() => useUpdateCoachingNote("m-1"), { wrapper })
  await result.current.mutateAsync({ noteId: "n-1", input: { kind: "outcome" } })
  expect(updateCoachingNote).toHaveBeenCalledWith("m-1", "n-1", { kind: "outcome" })
  expect(spy).toHaveBeenCalledWith({ queryKey: developmentKeys.notes("m-1") })
})

it("a delete the server did not confirm fails rather than removing the row on screen", async () => {
  deleteCoachingNote.mockResolvedValue({ data: { data: { deleted: false } } })
  const { result } = renderHook(() => useDeleteCoachingNote("m-1"), { wrapper })
  await expect(result.current.mutateAsync("n-1")).rejects.toThrow(/not deleted/i)
})

it("a confirmed delete invalidates the notes list", async () => {
  deleteCoachingNote.mockResolvedValue({ data: { data: { deleted: true } } })
  const spy = jest.spyOn(client, "invalidateQueries")
  const { result } = renderHook(() => useDeleteCoachingNote("m-1"), { wrapper })
  await expect(result.current.mutateAsync("n-1")).resolves.toBe("n-1")
  expect(spy).toHaveBeenCalledWith({ queryKey: developmentKeys.notes("m-1") })
})
