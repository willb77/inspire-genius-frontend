import { readFileSync } from "fs"
import { join } from "path"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import OrgActivityReport from "../OrgActivityReport"
import type { OrgActivityReport as Report } from "@/types/super-admin/orgActivity"

const svc = {
  getOrgActivityOrgs: jest.fn(),
  getOrgActivityReport: jest.fn(),
  downloadOrgActivityDocx: jest.fn(),
}
jest.mock("@/services/super-admin/orgActivity.service", () => ({
  getOrgActivityOrgs: () => svc.getOrgActivityOrgs(),
  getOrgActivityReport: (...a: unknown[]) => svc.getOrgActivityReport(...a),
  downloadOrgActivityDocx: (...a: unknown[]) => svc.downloadOrgActivityDocx(...a),
}))
const toastError = jest.fn()
jest.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: jest.fn() } }))

/** Invented people — this repo is public. */
function report(over: Partial<Report> = {}): Report {
  return {
    org: { id: "o1", name: "Org One" },
    include_internal: false,
    as_of: "2026-11-10",
    generated_on: "2026-11-18",
    timezone: "Eastern",
    empty: null,
    counts: {
      profiles_total: 3, customers: 2, internal: 1, included: 2,
      included_ever_active: 1, included_never_active: 1, customers_ever_active: 1,
    },
    roles: { user: 2 },
    members: [
      {
        uid: "u1", name: "Ada Example", email: "ada@church.example.org", role: "user", joined: "2026-11-02",
        internal: false, login_events: 3, login_days: 2, first_login: "2026-11-03", last_login: "2026-11-10",
        chat_msgs: 4, goals: 1, active_days: 2, ever_active: true,
      },
    ],
    members_total: 2,
    members_preview_cap: 200,
    internal_emails: ["t@example.com"],
    chat_total: 4,
    last_login: "2026-11-10",
    chat_by_agent: [{ agent_name: "Aura", n: 4, answered: 3 }],
    prism: [], prism_total: 0, prism_preview_cap: 200, prism_completed: 0,
    goals_total: 1,
    goal_cats: [{ category: "career", n: 1 }],
    goal_status: { provisional: 1 },
    weekly: [{ wk: "2026-11-02", users: 1, logins: 3, chats: 4 }],
    peak: { wk: "2026-11-02", users: 1, logins: 3, chats: 4, created_in_week: 2 },
    dow: [0, 0, 3, 0, 0, 0, 0],
    hour: Array(24).fill(0),
    frequency: { active_members: 1, median_active_days: 2, max_active_days: 2, single_day_members: 0 },
    never_active: ["Ben Example"],
    lumen_excluded: 2,
    truncated: {},
    caps: { roster: 5000, events: 200000, prism: 5000, goals: 20000 },
    ...over,
  }
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <OrgActivityReport />
    </QueryClientProvider>,
  )
}

async function chooseOrg(id = "o1") {
  const select = await screen.findByLabelText("Organization")
  fireEvent.change(select, { target: { value: id } })
}

beforeEach(() => {
  svc.getOrgActivityOrgs.mockResolvedValue([
    { id: "o1", name: "Org One", memberCount: 29 },
    { id: "o2", name: "Org Two", memberCount: 0 },
  ])
  svc.getOrgActivityReport.mockResolvedValue(report())
  svc.downloadOrgActivityDocx.mockResolvedValue({ blob: new Blob(["PK-bytes"]), filename: "x.docx" })
  Object.assign(URL, { createObjectURL: jest.fn(() => "blob:x"), revokeObjectURL: jest.fn() })
  HTMLAnchorElement.prototype.click = jest.fn()
})
afterEach(() => jest.clearAllMocks())

describe("OrgActivityReport", () => {
  it("lists every org with its member count and keeps Run disabled until one is chosen", async () => {
    setup()
    expect(await screen.findByRole("option", { name: "Org One (29 members)" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Org Two (0 members)" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Run/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Download Word/ })).toBeDisabled()
    expect(screen.getByRole("switch", { name: "Include internal test/demo accounts" })).not.toBeChecked()
  })

  it("runs with internal OFF by default and says the internal accounts are excluded", async () => {
    setup()
    await chooseOrg()
    fireEvent.click(screen.getByRole("button", { name: /Run/ }))
    const preview = await screen.findByTestId("org-activity-preview")
    expect(svc.getOrgActivityReport).toHaveBeenCalledWith("o1", false)
    expect(within(preview).getByText("Ada Example")).toBeInTheDocument()
    expect(within(preview).getByText(/1 internal test\/demo accounts are excluded/)).toBeInTheDocument()
    expect(within(preview).getByText("1 / 2")).toBeInTheDocument()
    expect(within(preview).getByText(/Showing the first 1 of 2 members/)).toBeInTheDocument()
    expect(within(preview).getByText(/2 automated 'Lumen moment delivered'|Excluded: 2 automated/)).toBeInTheDocument()
  })

  it("passes include_internal=true and labels the included accounts", async () => {
    svc.getOrgActivityReport.mockResolvedValue(
      report({
        include_internal: true,
        members: [{ ...report().members[0], uid: "i1", name: "Tess Tester", email: "t@example.com", internal: true }],
        members_total: 1,
      }),
    )
    setup()
    await chooseOrg()
    fireEvent.click(screen.getByRole("switch", { name: "Include internal test/demo accounts" }))
    fireEvent.click(screen.getByRole("button", { name: /Run/ }))
    const preview = await screen.findByTestId("org-activity-preview")
    expect(svc.getOrgActivityReport).toHaveBeenCalledWith("o1", true)
    expect(within(preview).getByText("Internal")).toBeInTheDocument()
    expect(within(preview).getByText(/INCLUDED and marked below/)).toBeInTheDocument()
  })

  it("downloads exactly the report on screen (the options it was run with)", async () => {
    setup()
    await chooseOrg()
    fireEvent.click(screen.getByRole("button", { name: /Run/ }))
    await screen.findByTestId("org-activity-preview")
    // Change the toggle after running: the download must still use the shown report's options.
    fireEvent.click(screen.getByRole("switch", { name: "Include internal test/demo accounts" }))
    expect(screen.getByText(/options changed since this report was run/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Download Word/ }))
    await waitFor(() => expect(svc.downloadOrgActivityDocx).toHaveBeenCalledWith("o1", false))
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
  })

  it("treats a zero-byte download as a failure, not a saved file", async () => {
    svc.downloadOrgActivityDocx.mockResolvedValue({ blob: new Blob([]), filename: "x.docx" })
    setup()
    await chooseOrg()
    fireEvent.click(screen.getByRole("button", { name: /Run/ }))
    await screen.findByTestId("org-activity-preview")
    fireEvent.click(screen.getByRole("button", { name: /Download Word/ }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it("a failed download says so", async () => {
    svc.downloadOrgActivityDocx.mockRejectedValue(new Error("503"))
    setup()
    await chooseOrg()
    fireEvent.click(screen.getByRole("button", { name: /Run/ }))
    await screen.findByTestId("org-activity-preview")
    fireEvent.click(screen.getByRole("button", { name: /Download Word/ }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not be built/)))
  })

  it.each([
    ["no_members", /no member profiles on this tier/],
    ["no_customer_members", /only internal test\/demo accounts/],
    ["no_activity", /no recorded sign-ins or coach questions/],
  ] as const)("says plainly when the report is empty: %s", async (empty, pattern) => {
    svc.getOrgActivityReport.mockResolvedValue(report({ empty, members: [], members_total: 0, weekly: [], peak: null }))
    setup()
    await chooseOrg()
    fireEvent.click(screen.getByRole("button", { name: /Run/ }))
    expect(await screen.findByRole("status")).toHaveTextContent(pattern)
    expect(screen.getByText(/no frequency to report/)).toBeInTheDocument()
  })

  it("renders a failed run as a failure and shows no numbers", async () => {
    svc.getOrgActivityReport.mockRejectedValue({ response: { status: 503 } })
    setup()
    await chooseOrg()
    fireEvent.click(screen.getByRole("button", { name: /Run/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be built/)
    expect(screen.queryByTestId("org-activity-preview")).not.toBeInTheDocument()
  })

  it("says not found for a 404", async () => {
    svc.getOrgActivityReport.mockRejectedValue({ response: { status: 404 } })
    setup()
    await chooseOrg()
    fireEvent.click(screen.getByRole("button", { name: /Run/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/not found/)
  })

  it("says so when the org list cannot be loaded", async () => {
    svc.getOrgActivityOrgs.mockRejectedValue(new Error("403"))
    setup()
    expect(await screen.findByRole("alert")).toHaveTextContent(/organization list could not be loaded/)
    expect(screen.queryByLabelText("Organization")).not.toBeInTheDocument()
  })

  it("states truncation in the caveats", async () => {
    svc.getOrgActivityReport.mockResolvedValue(report({ truncated: { roster: true, events: true } }))
    setup()
    await chooseOrg()
    fireEvent.click(screen.getByRole("button", { name: /Run/ }))
    await screen.findByTestId("org-activity-preview")
    expect(screen.getByText(/Only the first 5000 profiles are reported/)).toBeInTheDocument()
    expect(screen.getByText(/capped at the most recent 200000 events/)).toBeInTheDocument()
  })

  describe("organization search", () => {
    beforeEach(() => {
      svc.getOrgActivityOrgs.mockResolvedValue([
        { id: "o1", name: "Grace Chapel", memberCount: 29 },
        { id: "o2", name: "Société Générale Demo", memberCount: 5 },
        { id: "o3", name: "Grace Community Church", memberCount: 3 },
        { id: "o4", name: "Hope Church", memberCount: 0 },
      ])
    })

    const optionNames = () => screen.getAllByRole("option").map((o) => o.textContent)

    it("narrows the list as the user types and reports how many match", async () => {
      setup()
      const search = await screen.findByLabelText("Search organizations")
      expect(screen.getByText("4 organizations.")).toBeInTheDocument()
      fireEvent.change(search, { target: { value: "grace" } })
      expect(optionNames()).toEqual([
        "Choose an organization…",
        "Grace Chapel (29 members)",
        "Grace Community Church (3 members)",
      ])
      expect(screen.getByText("2 of 4 organizations match.")).toBeInTheDocument()
    })

    it("needs every word to match, in any order, ignoring case and accents", async () => {
      setup()
      const search = await screen.findByLabelText("Search organizations")
      fireEvent.change(search, { target: { value: "church  GRACE" } })
      expect(optionNames()).toEqual(["Choose an organization…", "Grace Community Church (3 members)"])
      fireEvent.change(search, { target: { value: "societe" } })
      expect(optionNames()).toEqual(["Choose an organization…", "Société Générale Demo (5 members)"])
    })

    it("says so when nothing matches, and restores the full list when cleared", async () => {
      setup()
      const search = await screen.findByLabelText("Search organizations")
      fireEvent.change(search, { target: { value: "zzz" } })
      expect(screen.getByText("No organization matches “zzz”.")).toBeInTheDocument()
      expect(optionNames()).toEqual(["Choose an organization…"])
      fireEvent.change(search, { target: { value: "" } })
      expect(optionNames()).toHaveLength(5)
    })

    it("keeps the chosen organization selectable and runnable while the search excludes it", async () => {
      setup()
      await chooseOrg("o4")
      fireEvent.change(screen.getByLabelText("Search organizations"), { target: { value: "grace" } })
      const select = screen.getByLabelText("Organization") as HTMLSelectElement
      expect(select.value).toBe("o4")
      expect(optionNames()).toContain("Hope Church (0 members)")
      expect(screen.getByText("2 of 4 organizations match.")).toBeInTheDocument()
      fireEvent.click(screen.getByRole("button", { name: /Run/ }))
      await screen.findByTestId("org-activity-preview")
      expect(svc.getOrgActivityReport).toHaveBeenCalledWith("o4", false)
    })
  })

  it("every t() key in the component exists in the English bundle", () => {
    const src = readFileSync(join(__dirname, "..", "OrgActivityReport.tsx"), "utf8")
    const bundle = JSON.parse(readFileSync(join(__dirname, "../../../../../public/locales/en/orgActivityUi.json"), "utf8"))
    const keys = [...src.matchAll(/\bt\(\s*"(\w+)"/g)].map((m) => m[1])
    expect(keys.length).toBeGreaterThan(40)
    expect(keys.filter((k) => !(k in bundle))).toEqual([])
  })
})
