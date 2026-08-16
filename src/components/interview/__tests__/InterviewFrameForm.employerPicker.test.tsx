/**
 * @jest-environment jsdom
 *
 * The employer picker: which curated packs the frame form surfaces, and — the
 * part that matters — what it refuses to claim. The backend resolver matches
 * aliases and strips corporate suffixes; the catalogue carries canonical names
 * only. So a confirmed hit is safe to show, and a miss is NOT safe to show.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import InterviewFrameForm from "../InterviewFrameForm"

const CATALOGUE = {
  provenance: "Compiled from public sources. Not affiliated with or endorsed by these employers.",
  employers: [
    {
      slug: "amazon",
      name: "Amazon",
      sector: "Technology",
      sectorSlug: "technology",
      framework: "Leadership Principles",
      questionCount: 12,
    },
    {
      slug: "mckinsey",
      name: "McKinsey",
      sector: "Consulting",
      sectorSlug: "consulting",
      framework: "Personal Experience Interview",
      questionCount: 9,
    },
  ],
  sectors: [
    {
      slug: "technology",
      name: "Technology",
      typicalEmployers: "Google, Meta, Microsoft",
      questionCount: 10,
    },
  ],
}

let catalogue: typeof CATALOGUE | undefined = CATALOGUE
jest.mock("@/hooks/interview/useEmployerPackCatalogue", () => ({
  useEmployerPackCatalogue: () => ({ data: catalogue }),
}))

function renderForm(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

beforeEach(() => {
  catalogue = CATALOGUE
})

describe("employer picker — what it offers", () => {
  it("offers every catalogued employer as a company suggestion", () => {
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    const list = document.getElementById("employer-pack-options")
    expect(list).not.toBeNull()
    const values = Array.from(list!.querySelectorAll("option")).map((o) => o.getAttribute("value"))
    expect(values).toEqual(["Amazon", "McKinsey"])
  })

  it("offers catalogued sectors on the industry field", () => {
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    const list = document.getElementById("sector-pack-options")
    const values = Array.from(list!.querySelectorAll("option")).map((o) => o.getAttribute("value"))
    expect(values).toEqual(["Technology"])
  })

  it("wires the datalists to the company and industry inputs", () => {
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    expect(screen.getByLabelText(/^company/i)).toHaveAttribute("list", "employer-pack-options")
    expect(screen.getByLabelText(/industry/i)).toHaveAttribute("list", "sector-pack-options")
  })

  it("states how many packs exist and that other companies still work", () => {
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    expect(screen.getByText(/2 employers and 1 sectors have a curated question set/i))
      .toBeInTheDocument()
    expect(screen.getByText(/any other company still gets a full interview/i)).toBeInTheDocument()
  })

  it("shows the provenance disclaimer alongside the named employers", () => {
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)
    expect(screen.getByText(/not affiliated with or endorsed by these employers/i))
      .toBeInTheDocument()
  })
})

describe("employer picker — confirms hits, never predicts misses", () => {
  it("confirms a curated set once a catalogued employer is typed", async () => {
    const user = userEvent.setup()
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    await user.type(screen.getByLabelText(/^company/i), "Amazon")

    expect(screen.getByText(/12 questions in Amazon.s style/i)).toBeInTheDocument()
  })

  it("matches case-insensitively and ignores surrounding whitespace", async () => {
    const user = userEvent.setup()
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    await user.type(screen.getByLabelText(/^company/i), "  mckinsey  ")

    expect(screen.getByText(/9 questions in McKinsey.s style/i)).toBeInTheDocument()
  })

  it("says NOTHING when the company is not in the catalogue", async () => {
    const user = userEvent.setup()
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    // "AWS" resolves to the Amazon pack server-side via an alias the catalogue
    // does not carry. Rendering "not covered" here would be a false negative.
    await user.type(screen.getByLabelText(/^company/i), "AWS")

    expect(screen.queryByText(/curated set available/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/not covered|no curated|unavailable/i)).not.toBeInTheDocument()
  })

  it("falls back to the sector when the company is uncatalogued", async () => {
    const user = userEvent.setup()
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    await user.type(screen.getByLabelText(/^company/i), "Some Startup")
    await user.type(screen.getByLabelText(/industry/i), "Technology")

    expect(screen.getByText(/10 sector-style questions/i)).toBeInTheDocument()
  })

  it("prefers the employer pack over the sector pack, matching the resolver", async () => {
    const user = userEvent.setup()
    renderForm(<InterviewFrameForm onConfirm={jest.fn()} />)

    await user.type(screen.getByLabelText(/^company/i), "Amazon")
    await user.type(screen.getByLabelText(/industry/i), "Technology")

    expect(screen.getByText(/12 questions in Amazon.s style/i)).toBeInTheDocument()
    expect(screen.queryByText(/sector-style questions/i)).not.toBeInTheDocument()
  })
})

describe("employer picker — degrades quietly", () => {
  it("renders the plain form when the catalogue endpoint is unavailable", async () => {
    catalogue = undefined
    const user = userEvent.setup()
    const onConfirm = jest.fn()
    renderForm(<InterviewFrameForm onConfirm={onConfirm} />)

    expect(screen.queryByText(/curated question set/i)).not.toBeInTheDocument()
    expect(document.getElementById("employer-pack-options")?.querySelectorAll("option").length ?? 0)
      .toBe(0)

    // The frame still submits — a dead catalogue must not block the interview.
    await user.type(screen.getByLabelText(/^company/i), "Acme Corp")
    await user.type(screen.getByLabelText(/industry/i), "Fintech")
    await user.type(screen.getByLabelText(/role title/i), "VP Engineering")
    await user.type(screen.getByLabelText(/reporting line/i), "CTO")
    await user.type(screen.getByLabelText(/scope of responsibility/i), "40 engineers")
    await user.click(screen.getByRole("button", { name: /confirm & start the interview/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0][0].company).toBe("Acme Corp")
  })

  it("keeps company free-text — an uncatalogued employer still submits", async () => {
    const user = userEvent.setup()
    const onConfirm = jest.fn()
    renderForm(<InterviewFrameForm onConfirm={onConfirm} />)

    await user.type(screen.getByLabelText(/^company/i), "Blackstone")
    await user.type(screen.getByLabelText(/industry/i), "Private Equity")
    await user.type(screen.getByLabelText(/role title/i), "Principal")
    await user.type(screen.getByLabelText(/reporting line/i), "MD")
    await user.type(screen.getByLabelText(/scope of responsibility/i), "Deal team of 6")
    await user.click(screen.getByRole("button", { name: /confirm & start the interview/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0][0].company).toBe("Blackstone")
    expect(onConfirm.mock.calls[0][0].industry).toBe("Private Equity")
  })
})
