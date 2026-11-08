/**
 * @jest-environment jsdom
 *
 * The distributor home (the house-style page; the classic page with its sample
 * figures was removed). Sample-data, empty and error states are covered in
 * house/__tests__/distributorPages.test.tsx; this file keeps the N-4 reviewer
 * queue mount, with the REAL ValidationReviewQueue.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DistributorDashboard from "../Dashboard";

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DistributorDashboard />
    </MemoryRouter>
  );

jest.mock("@/layouts/DistributorLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="distributor-layout">{children}</div>,
}));
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { fullName: "Test Distributor" } }),
}));

const mockUseDistributorPractitioners = jest.fn();
const mockUseDistributorCredits = jest.fn();
const mockUseDistributorTransactions = jest.fn();

jest.mock("@/hooks/distributor/useDistributor", () => ({
  useDistributorPractitioners: () => mockUseDistributorPractitioners(),
  useDistributorCredits: () => mockUseDistributorCredits(),
  useDistributorTransactions: () => mockUseDistributorTransactions(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

// N-4 — a distributor can be a blueprint-validation reviewer (backend #1830),
// so the reviewer's queue is mounted here. The REAL ValidationReviewQueue runs;
// only its data hooks are stubbed, so these tests prove the mount and the gate.
const mockValidationEnabled = jest.fn(() => false);
const mockAwaitingValidation = jest.fn<{ data: unknown[] | undefined }, []>(() => ({ data: undefined }));
jest.mock("@/hooks/job-blueprint/useBlueprintValidation", () => ({
  useValidationEnabled: () => mockValidationEnabled(),
  useAwaitingValidation: () => mockAwaitingValidation(),
  useRationale: () => ({ data: undefined, isLoading: false, isError: false }),
}));

describe("DistributorDashboard — N-4 reviewer queue", () => {
  const waiting = {
    blueprintId: "bp1", roleTitle: "Line Supervisor", version: 1, requestedBy: "Test Editor",
    requestedAt: "2026-10-19T10:00:00", note: null,
  };

  beforeEach(() => {
    mockUseDistributorPractitioners.mockReturnValue(hookDefaults);
    mockUseDistributorCredits.mockReturnValue(hookDefaults);
    mockUseDistributorTransactions.mockReturnValue(hookDefaults);
  });

  it("shows the queue when blueprint_validation is on and a request is waiting", () => {
    mockValidationEnabled.mockReturnValue(true);
    mockAwaitingValidation.mockReturnValue({ data: [waiting] });
    renderDashboard();
    expect(screen.getByTestId("validation-review-queue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Line Supervisor/ })).toBeInTheDocument();
  });

  it("renders no queue when blueprint_validation is off", () => {
    mockValidationEnabled.mockReturnValue(false);
    mockAwaitingValidation.mockReturnValue({ data: [waiting] });
    renderDashboard();
    expect(screen.queryByTestId("validation-review-queue")).not.toBeInTheDocument();
    expect(screen.getByTestId("distributor-layout")).toBeInTheDocument();
  });
});
