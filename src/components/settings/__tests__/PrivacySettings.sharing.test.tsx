/**
 * SHARE-1 (a): Settings → Privacy carries the sharing panel itself, the same
 * component the Goals sharing page renders, plus the way to the full page.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

jest.mock("@/pages/summit/SummitSharing", () => ({
  __esModule: true,
  default: () => <div data-testid="whole-page" />,
  SharingCore: () => <div data-testid="sharing-core" />,
}))
jest.mock("@/hooks/privacy/usePrivacy", () => ({
  useDeleteUserData: () => ({ mutate: jest.fn(), isPending: false }),
  useExportUserData: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "me" }, logout: jest.fn() }),
}))

import PrivacySettings from "../PrivacySettings"
import { ROUTES } from "@/constants/routes"

function renderSettings() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PrivacySettings />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it("renders the sharing panel itself, not only a link to it", async () => {
  renderSettings()
  expect(await screen.findByTestId("sharing-core")).toBeInTheDocument()
  expect(screen.queryByTestId("whole-page")).toBeNull()
})

it("keeps the way to the full page", async () => {
  renderSettings()
  await screen.findByTestId("sharing-core")
  expect(screen.getByRole("link", { name: /open the full page/i })).toHaveAttribute("href", ROUTES.MY_GOALS.SHARING)
})
