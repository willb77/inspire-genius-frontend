import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProgramOutcomes } from "../ProgramOutcomes"
import {
  getProgramOutcomes,
  getRoleFamilies,
  replaceProgramOutcomes,
} from "@/services/curriculum/curriculum.service"
import { BLUEPRINT_ID, http, programOutcomes, renderCurriculum, ROLE_FAMILIES } from "@/test/curriculumFixtures"

jest.mock("@/services/curriculum/curriculum.service")
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const m = <T extends (...a: never[]) => unknown>(f: T) => f as unknown as jest.MockedFunction<T>
const read = m(getProgramOutcomes)
const families = m(getRoleFamilies)
const save = m(replaceProgramOutcomes)

const PROGRAM = { id: "prog-1", code: "P1", title: "Example Program" }

function renderPanel(editable = true) {
  return renderCurriculum(<ProgramOutcomes catalogId="cat-1" program={PROGRAM} editable={editable} />)
}

async function openForm() {
  await userEvent.click(await screen.findByRole("button", { name: "Edit outcomes" }))
  return screen.findByRole("form", { name: "Outcomes form" })
}

beforeEach(() => {
  jest.resetAllMocks()
  read.mockResolvedValue(programOutcomes())
  families.mockResolvedValue(ROLE_FAMILIES)
  save.mockResolvedValue(undefined)
})

describe("ProgramOutcomes — viewing", () => {
  it("shows each outcome: family, linked role with its status, SOC code labelled not validated", async () => {
    renderPanel()
    expect(await screen.findByText("Example Analyst")).toBeInTheDocument()
    expect(screen.getByText("Data & Quantitative")).toBeInTheDocument()
    expect(screen.getByText(BLUEPRINT_ID)).toBeInTheDocument()
    expect(screen.getByText(/· active/)).toBeInTheDocument()
    expect(screen.getByText("15-2051")).toBeInTheDocument()
    expect(screen.getByText("not validated")).toBeInTheDocument()
    expect(screen.getByText(ROLE_FAMILIES.socCodeNote)).toBeInTheDocument()
  })

  it("says so when there are no outcomes, and when the role library can't be read", async () => {
    read.mockResolvedValue(
      programOutcomes(
        "draft",
        [
          {
            roleFamily: "Healthcare & Care",
            blueprintId: BLUEPRINT_ID,
            socCode: null,
            socCodeValidated: false,
            blueprint: { id: BLUEPRINT_ID, title: null, status: "unknown" },
          },
        ],
        false
      )
    )
    const { unmount } = renderPanel()
    expect(await screen.findByText(/role library can’t be read right now/)).toBeInTheDocument()
    expect(screen.getByText("Untitled role")).toBeInTheDocument()
    expect(screen.getByText(/· status unknown/)).toBeInTheDocument()
    unmount()
    read.mockResolvedValue(programOutcomes("draft", []))
    renderPanel()
    expect(await screen.findByText(/No outcomes yet/)).toBeInTheDocument()
  })

  it("renders a failed read and retries", async () => {
    read.mockRejectedValueOnce(http(403, "Curriculum is not switched on yet on this tier."))
    renderPanel()
    expect(await screen.findByRole("alert")).toHaveTextContent("Curriculum is not switched on yet on this tier.")
    await userEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(await screen.findByText("Example Analyst")).toBeInTheDocument()
  })
})

describe("ProgramOutcomes — draft-only editing", () => {
  it("is read-only on a published catalog, pointing at the page's Edit (CUR-UNLOCK)", async () => {
    read.mockResolvedValue(programOutcomes("published"))
    renderPanel(false)
    expect(
      await screen.findByText(/Read-only: this catalog is published\. To change outcomes, use Edit at the top of this page/)
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit outcomes" })).not.toBeInTheDocument()
  })

  it("is read-only when the page says the catalog is not a draft, even if the read says draft", async () => {
    renderPanel(false)
    expect(await screen.findByText("Example Analyst")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit outcomes" })).not.toBeInTheDocument()
  })

  it("is read-only when the server's read says the catalog is not a draft, even if the page says editable", async () => {
    read.mockResolvedValue(programOutcomes("superseded"))
    renderPanel(true)
    expect(await screen.findByText(/Read-only: this catalog is superseded/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit outcomes" })).not.toBeInTheDocument()
  })
})

describe("ProgramOutcomes — editing a draft", () => {
  it("adds an outcome with a family, a pasted role id and a SOC code, and PUTs the whole list", async () => {
    renderPanel()
    const form = await openForm()
    await userEvent.click(within(form).getByRole("button", { name: "Add outcome" }))
    await userEvent.selectOptions(screen.getByLabelText("Role family", { selector: "#outcome-family-1" }), "Healthcare & Care")
    await userEvent.type(screen.getByLabelText(/Role \(blueprint\) id/, { selector: "#outcome-blueprint-1" }), " pasted-id ")
    await userEvent.type(screen.getByLabelText(/SOC \/ O\*NET code/, { selector: "#outcome-soc-1" }), "29-1141.00")
    await userEvent.click(screen.getByRole("button", { name: "Save outcomes" }))
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith("prog-1", [
        { roleFamily: "Data & Quantitative", blueprintId: BLUEPRINT_ID, socCode: "15-2051" },
        { roleFamily: "Healthcare & Care", blueprintId: "pasted-id", socCode: "29-1141.00" },
      ])
    )
    expect(await screen.findByRole("button", { name: "Edit outcomes" })).toBeInTheDocument()
  })

  it("clears every outcome with an empty list", async () => {
    renderPanel()
    await openForm()
    await userEvent.click(screen.getByRole("button", { name: "Remove outcome 1" }))
    expect(screen.getByText(/saving now clears/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Save outcomes" }))
    await waitFor(() => expect(save).toHaveBeenCalledWith("prog-1", []))
  })

  it("refuses a malformed SOC code in the form, without a round trip", async () => {
    renderPanel()
    await openForm()
    const soc = screen.getByLabelText(/SOC \/ O\*NET code/, { selector: "#outcome-soc-0" })
    await userEvent.clear(soc)
    await userEvent.type(soc, "151252")
    await userEvent.click(screen.getByRole("button", { name: "Save outcomes" }))
    expect(await screen.findByText("Use NN-NNNN or NN-NNNN.NN (format only — not validated)")).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it("refuses a duplicate outcome in the form", async () => {
    read.mockResolvedValue(programOutcomes("draft", []))
    renderPanel()
    await openForm()
    for (let i = 0; i < 2; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Add outcome" }))
      await userEvent.selectOptions(
        screen.getByLabelText("Role family", { selector: `#outcome-family-${i}` }),
        "Data & Quantitative"
      )
    }
    await userEvent.click(screen.getByRole("button", { name: "Save outcomes" }))
    expect(await screen.findByText("Outcome 2 repeats an earlier outcome")).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it("stops adding at the per-program cap", async () => {
    const twenty = Array.from({ length: 20 }, (_, i) => ({
      roleFamily: "Data & Quantitative",
      blueprintId: null,
      socCode: `15-${1000 + i}`,
      socCodeValidated: false,
      blueprint: null,
    }))
    read.mockResolvedValue(programOutcomes("draft", twenty))
    renderPanel()
    await openForm()
    expect(screen.getByRole("button", { name: "Add outcome" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Remove outcome 20" }))
    expect(screen.getByRole("button", { name: "Add outcome" })).toBeEnabled()
  })

  it("renders the role families' failure instead of an empty picker", async () => {
    families.mockRejectedValue(http(503, "The curriculum tables are not set up on this tier."))
    renderPanel()
    await userEvent.click(await screen.findByRole("button", { name: "Edit outcomes" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("The curriculum tables are not set up on this tier.")
  })
})

describe("ProgramOutcomes — the server's refusals are rendered as sent", () => {
  const cases: [string, number, unknown, string[]][] = [
    [
      "a role that can't be linked (422, names the id)",
      422,
      {
        message: "These roles can't be linked to this school's program: abc. A linked role must be active.",
        blueprintIds: ["abc"],
      },
      ["These roles can't be linked to this school's program: abc. A linked role must be active."],
    ],
    [
      "a rule check (422 with its list)",
      422,
      { message: "Outcome 1: 'x' is not a role id.", errors: ["Outcome 1: 'x' is not a role id."] },
      ["Outcome 1: 'x' is not a role id."],
    ],
    [
      "a catalog published meanwhile (409)",
      409,
      "This catalog is published, and published catalogs are never edited.",
      ["This catalog is published, and published catalogs are never edited."],
    ],
    ["the role check (403)", 403, "Super-admin access required.", ["Super-admin access required."]],
    [
      "the role library down (503)",
      503,
      "The role library can't be read right now, so role links can't be checked. Nothing was changed; try again shortly.",
      ["The role library can't be read right now"],
    ],
  ]

  it.each(cases)("%s", async (_name, status, detail, expected) => {
    save.mockRejectedValue(http(status, detail))
    renderPanel()
    await openForm()
    await userEvent.click(screen.getByRole("button", { name: "Save outcomes" }))
    const alert = await screen.findByRole("alert")
    for (const text of expected) expect(alert).toHaveTextContent(text)
    expect(alert).not.toHaveTextContent("The outcomes were not saved.")
    // The form stays open with the user's input, so nothing is lost.
    expect(screen.getByRole("form", { name: "Outcomes form" })).toBeInTheDocument()
  })
})
