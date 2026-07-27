/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { useAllRoles } from "../useAllRoles"

jest.mock("@/services/job-blueprint", () => ({
  jobDnaService: {
    list: jest.fn().mockResolvedValue({
      data: {
        data: [
          { id: "j1", roleTitle: "Engineer" },
          { id: "j2", roleTitle: "Analyst" },
        ],
      },
    }),
  },
}))

jest.mock("@/services/knowledge-continuity/continuity.service", () => ({
  listSavedRoles: jest.fn().mockResolvedValue({
    data: {
      roles: [
        // "engineer" collides with the Job DNA row (case-insensitive) → dropped.
        { role_title: "engineer", node_count: 5, taxonomy_id: "t1", created_at: null },
        { role_title: "Nurse", node_count: 9, taxonomy_id: "t2", created_at: null },
      ],
    },
  }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useAllRoles", () => {
  it("aggregates roles from both verticals, de-duped by title (Job DNA wins)", async () => {
    const { result } = renderHook(() => useAllRoles(), { wrapper })

    await waitFor(() => expect(result.current.roles.length).toBe(3))

    const roles = result.current.roles
    // Sorted alphabetically: Analyst, Engineer, Nurse
    expect(roles.map((r) => r.role_title)).toEqual(["Analyst", "Engineer", "Nurse"])

    const engineer = roles.find((r) => r.role_title === "Engineer")!
    expect(engineer.source).toBe("job-dna")
    expect(engineer.id).toBe("j1")

    const nurse = roles.find((r) => r.role_title === "Nurse")!
    expect(nurse.source).toBe("kce")
    expect(nurse.node_count).toBe(9)

    // The case-insensitive duplicate from KCE was dropped.
    expect(roles.filter((r) => r.role_title.toLowerCase() === "engineer")).toHaveLength(1)
  })
})
