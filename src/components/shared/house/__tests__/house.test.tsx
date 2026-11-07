/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { PageHeader } from "../PageHeader"
import { PageState, SampleDataBanner } from "../PageState"
import { DeleteConfirm } from "../DeleteConfirm"

describe("PageHeader", () => {
  it("renders title, purpose line, back link and one action", () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="My team"
          description="Everyone who reports to you."
          back={{ to: "/home", label: "Home" }}
          action={<button>Add people</button>}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole("heading", { level: 1, name: "My team" })).toBeInTheDocument()
    expect(screen.getByText("Everyone who reports to you.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/home")
    expect(screen.getByRole("button", { name: "Add people" })).toBeInTheDocument()
  })

  it("renders nothing optional when only a title is given", () => {
    render(
      <MemoryRouter>
        <PageHeader title="Reports" />
      </MemoryRouter>,
    )
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("PageState", () => {
  it("loading is a skeleton with a status role, not a spinner", () => {
    render(<PageState kind="loading" rows={2} />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("empty says what is missing and offers one button", () => {
    render(
      <PageState
        kind="empty"
        title="No clients yet"
        message="Add your first client to get started."
        action={<button>Add client</button>}
      />,
    )
    expect(screen.getByRole("heading", { name: "No clients yet" })).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add client" })).toBeInTheDocument()
  })

  it("error is an alert, never an empty state, and retries", () => {
    const onRetry = jest.fn()
    render(
      <PageState
        kind="error"
        message="We couldn't load your team."
        onRetry={onRetry}
        helpHref="/help"
      />,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load your team.")
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("link", { name: "Get help" })).toHaveAttribute("href", "/help")
  })

  it("error without retry or help shows no buttons", () => {
    render(<PageState kind="error" message="We couldn't load this." />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("unavailable says so honestly with a way onward", () => {
    render(
      <PageState
        kind="unavailable"
        message="Job matches are switched off for now."
        action={<a href="/careers">Careers that suit you</a>}
      />,
    )
    expect(screen.getByRole("status")).toHaveTextContent("Job matches are switched off for now.")
    expect(screen.getByRole("link", { name: "Careers that suit you" })).toBeInTheDocument()
  })

  it("sample-data banner uses the one shared wording", () => {
    render(<SampleDataBanner />)
    expect(screen.getByRole("note")).toHaveTextContent("Sample data — not your organization's.")
  })
})

describe("DeleteConfirm", () => {
  it("asks 'Delete {thing}? This can't be undone.' and runs only on Delete", async () => {
    const onConfirm = jest.fn()
    render(<DeleteConfirm thing="expired data" trigger={<button>Delete expired data…</button>} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole("button", { name: "Delete expired data…" }))
    expect(await screen.findByText("Delete expired data?")).toBeInTheDocument()
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Delete expired data…" }))
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  })
})
