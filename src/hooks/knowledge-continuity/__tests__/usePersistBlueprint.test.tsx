/**
 * @jest-environment jsdom
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

const mockCreateTaxonomyNode = jest.fn()
jest.mock("@/services/knowledge-continuity/continuity.service", () => ({
  createTaxonomyNode: (...a: unknown[]) => mockCreateTaxonomyNode(...a),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

import { isRoleExistsError, roleExistsMessage, usePersistBlueprint } from "../usePersistBlueprint"
import type { BlueprintNode } from "@/types/knowledge-continuity"

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const NODES: BlueprintNode[] = [
  { ref: "c1", parent_ref: "r1", depth: 1, name: "Child A", node_type: "task", section: null, rationale: null },
  { ref: "r1", parent_ref: null, depth: 0, name: "Root", node_type: "domain", section: null, rationale: null },
  { ref: "c2", parent_ref: "r1", depth: 1, name: "Child B", node_type: "task", section: null, rationale: null },
]

const GENERIC = "Couldn't save the blueprint. Some nodes may not have been created."

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
})

describe("usePersistBlueprint (D-10 duplicate role title)", () => {
  test("the first node asks the server to refuse an existing title; the rest append", async () => {
    let n = 0
    mockCreateTaxonomyNode.mockImplementation(async () => ({ status: true, data: { id: `id-${++n}` } }))

    const { result } = renderHook(() => usePersistBlueprint(), { wrapper })
    result.current.mutate({ org_id: "kce-capture", role_title: "Line Lead", nodes: NODES })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const calls = mockCreateTaxonomyNode.mock.calls.map((c) => c[0])
    expect(calls).toHaveLength(3)
    expect(calls[0]).toMatchObject({ name: "Root", role_title: "Line Lead", if_role_exists: "error" })
    expect(calls[1]).toMatchObject({ if_role_exists: "append", parent_id: "id-1" })
    expect(calls[2]).toMatchObject({ if_role_exists: "append", parent_id: "id-1" })
    expect(result.current.data).toEqual({ created: 3, rootId: "id-1" })
  })

  test("a 409 role_exists names the role, says to rename, and writes nothing further", async () => {
    mockCreateTaxonomyNode.mockRejectedValue({
      response: { status: 409, data: { detail: { code: "role_exists", message: "exists" } } },
    })

    const { result } = renderHook(() => usePersistBlueprint(), { wrapper })
    result.current.mutate({ org_id: "kce-capture", role_title: "Line Lead", nodes: NODES })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mockCreateTaxonomyNode).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith('A role named "Line Lead" already exists. Rename it to save.')
    expect(toast.error).not.toHaveBeenCalledWith(GENERIC)
  })

  test("any other failure keeps the generic message", async () => {
    mockCreateTaxonomyNode.mockRejectedValue({ response: { status: 500 } })
    const { result } = renderHook(() => usePersistBlueprint(), { wrapper })
    result.current.mutate({ org_id: "kce-capture", role_title: "Line Lead", nodes: NODES })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith(GENERIC)
  })
})

describe("isRoleExistsError", () => {
  test.each<[string, unknown, boolean]>([
    ["409 role_exists", { response: { status: 409, data: { detail: { code: "role_exists" } } } }, true],
    ["409 other code", { response: { status: 409, data: { detail: { code: "other" } } } }, false],
    ["409 string detail", { response: { status: 409, data: { detail: "role_exists" } } }, false],
    ["409 null detail", { response: { status: 409, data: { detail: null } } }, false],
    ["422 role_exists", { response: { status: 422, data: { detail: { code: "role_exists" } } } }, false],
    ["no response", new Error("network"), false],
  ])("%s", (_name, error, expected) => {
    expect(isRoleExistsError(error)).toBe(expected)
  })

  test("roleExistsMessage quotes the title", () => {
    expect(roleExistsMessage("Welder")).toBe('A role named "Welder" already exists. Rename it to save.')
  })
})
