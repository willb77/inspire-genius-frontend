/**
 * @jest-environment jsdom
 */
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"

const mockNextQuestion = jest.fn()
jest.mock("@/services/knowledge-continuity/capture.service", () => ({
  nextQuestion: (...a: unknown[]) => mockNextQuestion(...a),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

import { useNextQuestion } from "../useNextQuestion"

let qc: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  jest.clearAllMocks()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe("useNextQuestion", () => {
  test("returns the question payload on success without toasting", async () => {
    mockNextQuestion.mockResolvedValue({
      status: true,
      data: { question: "How do you start?", coverage_note: "Safety not yet covered." },
    })

    const { result } = renderHook(() => useNextQuestion(), { wrapper })
    result.current.mutate({
      role_title: "Operator",
      node: { name: "Recover plant", node_type: "task" },
      transcript: [],
      is_first: true,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      question: "How do you start?",
      coverage_note: "Safety not yet covered.",
    })
    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  test("toasts an error on failure", async () => {
    const error = new Error("boom") as AxiosError
    error.response = { status: 500 } as AxiosError["response"]
    error.isAxiosError = true
    mockNextQuestion.mockRejectedValue(error)

    const { result } = renderHook(() => useNextQuestion(), { wrapper })
    result.current.mutate({
      role_title: "Operator",
      node: { name: "Recover plant", node_type: "task" },
      transcript: [],
      is_first: true,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith("Couldn't get the next question. Please try again.")
  })
})
