/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { PasswordChecklist } from "../PasswordChecklist"

describe("PasswordChecklist", () => {
  it("marks each rule met or still needed, for sighted and screen-reader users", () => {
    render(<PasswordChecklist password="abcdefgh" />)
    const list = screen.getByRole("list", { name: "Password rules" })
    expect(list.querySelectorAll("li")).toHaveLength(4)
    expect(screen.getByText("At least 8 characters").closest("li")).toHaveAttribute("data-met", "true")
    expect(screen.getByText("A capital letter").closest("li")).toHaveAttribute("data-met", "false")
    expect(screen.getByText("A capital letter").closest("li")).toHaveTextContent("still needed")
    expect(screen.getByText("A small letter").closest("li")).toHaveTextContent("done")
  })
})
