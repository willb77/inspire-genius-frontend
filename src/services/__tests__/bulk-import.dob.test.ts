/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { bulkImportUsers } from "../bulk-import"
import type { BulkUserRecord } from "@/types/bulk-import"

jest.mock("@/lib/axios", () => ({ api: { post: jest.fn() } }))

const mockPost = api.post as jest.Mock

test("N-2: a date of birth never goes to the import itself", async () => {
  mockPost.mockResolvedValueOnce({ data: { batch_id: "b" } })
  const record = {
    fname: "A", lname: "B", email1: "a@example.test", user_type: "user", date_of_birth: "2011-04-09",
  } as BulkUserRecord
  await bulkImportUsers([record])
  const body = mockPost.mock.calls[0][1] as { users: Record<string, unknown>[] }
  expect(body.users[0]).not.toHaveProperty("date_of_birth")
  expect(body.users[0]).toMatchObject({ fname: "A", email1: "a@example.test" })
  expect(record.date_of_birth).toBe("2011-04-09")
})
