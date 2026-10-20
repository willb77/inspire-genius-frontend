import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"

const bulkInviteUsers = jest.fn()
jest.mock("@/services/super-admin/user-management/user-management.service", () => ({
  bulkInviteUsers: (users: unknown) => bulkInviteUsers(users),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } }))

import { useBulkDemoInvite } from "@/hooks/useBulkImport"

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// The Skip-onboarding backend writes organization_id to user_profiles.org_id —
// organisation membership. Resolving the name and then not sending the id
// would reproduce the original bug exactly: users created in no organisation.
test("sends the resolved organization_id per row, and nothing for rows without one", async () => {
  bulkInviteUsers.mockResolvedValue({
    data: { summary: { total: 2, successful: 2, failed: 0 }, successful_invitations: [], failed_invitations: [] },
  })
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const { result } = renderHook(() => useBulkDemoInvite(), { wrapper: wrapper(qc) })
  await act(async () => {
    await result.current.mutateAsync([
      { fname: "A", lname: "One", email1: "a1@example.com", user_type: "user", organization: "test-org-a",
        organization_id: "org-a-id" },
      { fname: "B", lname: "Two", email1: "b2@example.com", user_type: "user" },
    ])
  })
  const sent = bulkInviteUsers.mock.calls.flatMap(([users]) => users as Record<string, unknown>[])
  expect(sent[0]).toMatchObject({ email: "a1@example.com", organization_id: "org-a-id" })
  expect(sent[1].organization_id).toBeUndefined()
  // the NAME is never sent: the backend takes an id
  expect(sent[0]).not.toHaveProperty("organization")
})
