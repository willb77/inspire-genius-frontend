/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import RosterAgeNotice from "../RosterAgeNotice"

const base = { total: 4, recorded: 4, invalid_date: 0, not_permitted: 0, not_enabled: 0, results: [] }

describe("RosterAgeNotice", () => {
  it("renders nothing when no recording was attempted", () => {
    const { container } = render(<RosterAgeNotice isPending={false} isError={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("says so while recording", () => {
    render(<RosterAgeNotice isPending isError={false} />)
    expect(screen.getByRole("status")).toHaveTextContent("Recording dates of birth")
  })

  it("a failure is an alert, not silence", () => {
    render(<RosterAgeNotice isPending={false} isError />)
    expect(screen.getByRole("alert")).toHaveTextContent("could not be recorded")
  })

  it("all recorded is a plain status", () => {
    render(<RosterAgeNotice isPending={false} isError={false} data={base} />)
    expect(screen.getByRole("status")).toHaveTextContent("recorded for 4 of 4")
  })

  it("every row not recorded is counted, by cause", () => {
    render(
      <RosterAgeNotice
        isPending={false}
        isError={false}
        data={{ ...base, recorded: 1, invalid_date: 1, not_permitted: 1, not_enabled: 1 }}
      />,
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("recorded for 1 of 4")
    expect(alert).toHaveTextContent("1 had a date that could not be used")
    expect(alert).toHaveTextContent("1 belong to another organisation")
    expect(alert).toHaveTextContent("under-18 support is not switched on")
  })
})
