/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import PractitionerMeridianChat from "../MeridianChat"

const mockMeridianChat = jest.fn()
jest.mock("@/pages/user/MeridianChat", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockMeridianChat(props)
    return <div data-testid="meridian-chat" />
  },
}))

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe("PractitionerMeridianChat", () => {
  it("renders the shared MeridianChat wrapped in the practitioner layout", () => {
    render(<PractitionerMeridianChat />)
    expect(screen.getByTestId("meridian-chat")).toBeInTheDocument()
    expect(mockMeridianChat).toHaveBeenCalledWith(
      expect.objectContaining({ LayoutComponent: expect.any(Function) }),
    )
  })
})
