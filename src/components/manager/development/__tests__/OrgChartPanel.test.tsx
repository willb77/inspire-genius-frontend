import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OrgChartPanel } from "../OrgChartPanel"

const getOrgChart = jest.fn()
const navigate = jest.fn()

jest.mock("@/services/manager/development/growthService", () => ({
  getOrgChart: () => getOrgChart(),
}))
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => navigate,
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const chart = (over: Record<string, unknown> = {}) => ({
  data: {
    data: {
      nodes: [
        { id: "ceo", name: "Cleo Chief", title: "CEO", department: "Exec", managerId: null },
        { id: "will", name: "Will Brown", title: "Lead", department: "Ops", managerId: "ceo" },
        { id: "ben", name: "Ben Burnette", title: "QA", department: "Ops", managerId: "will" },
      ],
      viewerId: "will",
      truncated: false,
      ...over,
    },
  },
})

beforeEach(() => {
  jest.clearAllMocks()
  getOrgChart.mockResolvedValue(chart())
})

const render_ = () =>
  render(<OrgChartPanel memberRoute="/manager/development/:memberId" />, { wrapper })

it("renders the whole tree, rolling down from the root", async () => {
  render_()
  // Scoped to the chart itself: a name also appears in the "you report up
  // through" breadcrumb above it, so an unscoped query matches twice and the
  // failure would read as "not rendered" when it means "rendered twice".
  await waitFor(() => expect(screen.getByLabelText("Organisation chart")).toBeInTheDocument())
  const chart_ = within(screen.getByLabelText("Organisation chart"))
  expect(chart_.getByText("Cleo Chief")).toBeInTheDocument()
  expect(chart_.getByText("Will Brown")).toBeInTheDocument()
  expect(chart_.getByText("Ben Burnette")).toBeInTheDocument()
  // Nesting is STRUCTURAL, not a padding value. The chart used to convey depth
  // with `paddingLeft`, which meant every card was a sibling in the DOM and the
  // hierarchy existed only as a number — a flat list wearing an indent. Assert
  // containment instead: Ben sits inside Will's subtree, which sits inside
  // Cleo's. That survives a restyle and fails on a genuinely flattened tree.
  const cardOf = (name: string) => chart_.getByText(name).closest("li") as HTMLElement
  const cleo = cardOf("Cleo Chief")
  const will = cardOf("Will Brown")
  const ben = cardOf("Ben Burnette")
  expect(cleo).toContainElement(will)
  expect(will).toContainElement(ben)
  // ...and not the other way round, which containment alone would not catch if
  // every node were rendered inside every other.
  expect(ben).not.toContainElement(will)
})

it("draws connectors rather than indentation", async () => {
  // The visual difference between an org chart and a file tree is the lines. A
  // nested <ul> with no connector classes renders as an indented list and every
  // structural assertion above still passes.
  render_()
  await waitFor(() => expect(screen.getByLabelText("Organisation chart")).toBeInTheDocument())
  const chart_ = within(screen.getByLabelText("Organisation chart"))
  const will = chart_.getByText("Will Brown").closest("li") as HTMLElement
  // Will is not a root, so his card hangs from a drawn connector.
  expect(will.className).toMatch(/before:border-t/)
  expect(will.className).toMatch(/after:border-l/)
  // Nobody carries a hardcoded pixel indent any more.
  expect(will.getAttribute("style")).toBeNull()
})

it("shows the viewer's chain upward", async () => {
  render_()
  await waitFor(() => expect(screen.getByText(/report up through/i)).toBeInTheDocument())
  expect(screen.getByText("(you)")).toBeInTheDocument()
})

it("collapses a subtree without hiding the person", async () => {
  render_()
  await waitFor(() => expect(screen.getByText("Ben Burnette")).toBeInTheDocument())
  await userEvent.click(screen.getByLabelText("Hide Will Brown's reports"))
  expect(screen.getByText("Will Brown")).toBeInTheDocument()
  expect(screen.queryByText("Ben Burnette")).not.toBeInTheDocument()
})

it("routes to the member workspace on the route it was GIVEN", async () => {
  // Practitioners reach this page through a different route tree. Hardcoding
  // the manager path would send them somewhere their ProtectedRoute rejects.
  render(<OrgChartPanel memberRoute="/practitioner/development/:memberId" />, { wrapper })
  await waitFor(() => expect(screen.getByText("Ben Burnette")).toBeInTheDocument())
  await userEvent.click(screen.getByLabelText("Open Ben Burnette's workspace"))
  expect(navigate).toHaveBeenCalledWith("/practitioner/development/ben")
})

it("says a load FAILED rather than showing an empty organisation", async () => {
  // The dishonest empty state this surface keeps having to defend against:
  // "nobody to show" and "we could not ask" look identical otherwise.
  getOrgChart.mockRejectedValue(new Error("503"))
  render_()
  await waitFor(() =>
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument(),
  )
  expect(screen.getByText(/not an empty organisation/i)).toBeInTheDocument()
})

it("distinguishes a genuinely empty organisation from a failure", async () => {
  getOrgChart.mockResolvedValue(chart({ nodes: [], viewerId: null, orgResolved: true }))
  render_()
  await waitFor(() =>
    expect(screen.getByText(/nobody is on file for your organisation/i)).toBeInTheDocument(),
  )
  // ...and does NOT claim anything about reporting lines in an org that has
  // nobody in it to have reporting lines between.
  expect(screen.queryByText(/no reporting lines/i)).not.toBeInTheDocument()
})

it("does not call an UNIDENTIFIED organisation an empty one", async () => {
  // `nodes: []` is produced by two very different facts. Until this split, the
  // panel asserted the wrong one: it told a user whose org could not be
  // resolved that their organisation had no reporting lines on file — a claim
  // about an organisation nobody had identified.
  getOrgChart.mockResolvedValue(chart({ nodes: [], viewerId: null, orgResolved: false }))
  render_()
  await waitFor(() =>
    expect(
      screen.getByText(/could not work out which organisation you belong to/i),
    ).toBeInTheDocument(),
  )
  expect(screen.queryByText(/nobody is on file/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/no reporting lines/i)).not.toBeInTheDocument()
})

it("explains a flat chart instead of leaving it looking broken", async () => {
  // Real data: an org where nobody has a manager recorded renders as a bare
  // list of names. That is correct, and indistinguishable from a broken chart
  // unless it says why.
  getOrgChart.mockResolvedValue(
    chart({
      nodes: [
        { id: "a", name: "Kevin McCoy", title: null, department: null, managerId: null },
        { id: "b", name: "Michael Brown", title: null, department: null, managerId: null },
      ],
      viewerId: "a",
    }),
  )
  render_()
  await waitFor(() => expect(screen.getByText("Kevin McCoy")).toBeInTheDocument())
  expect(screen.getByText("Michael Brown")).toBeInTheDocument()
  expect(screen.getByText(/everyone appears at the top level/i)).toBeInTheDocument()
})

it("does not explain flatness on a chart that has a hierarchy", async () => {
  render_()
  await waitFor(() => expect(screen.getByText("Ben Burnette")).toBeInTheDocument())
  expect(screen.queryByText(/everyone appears at the top level/i)).not.toBeInTheDocument()
})

it("says so out loud when the chart is truncated", async () => {
  getOrgChart.mockResolvedValue(chart({ truncated: true }))
  render_()
  await waitFor(() => expect(screen.getByText(/cut short/i)).toBeInTheDocument())
})

it("shows no scores or assessment coverage anywhere", async () => {
  // The reason this surface can be shown to the whole organisation. A card that
  // grew a coverage dot would publish who has and has not completed an
  // assessment, org-wide, and nothing would error.
  const { container } = render_()
  await waitFor(() => expect(screen.getByText("Ben Burnette")).toBeInTheDocument())
  const text = container.textContent ?? ""
  for (const forbidden of ["PRISM", "Clifton", "DISC", "Gold", "Green", "scales"]) {
    expect(text).not.toContain(forbidden)
  }
})
