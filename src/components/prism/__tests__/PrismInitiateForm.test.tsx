import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrismInitiateForm from "../PrismInitiateForm";

/* Mock the check-existing-customer hook so the form renders without a
   QueryClientProvider (it wraps useMutation under the hood). */
jest.mock("@/hooks/prism/useCheckExistingCustomer", () => ({
  useCheckExistingCustomer: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ data: { exists: false } }),
    isPending: false,
  }),
  checkCustomerKey: ["prism", "check-customer"],
}));

/* Mock the survey-request mutation for the same reason. `mockRequestSurvey`
   is what the wiring tests assert against. */
const mockRequestSurvey = jest.fn();
jest.mock("@/hooks/prism/usePrismRequest", () => ({
  useRequestPrismSurvey: () => ({
    mutateAsync: mockRequestSurvey,
    isPending: false,
  }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

/* Mock the Select components from shadcn which use Radix and fail in jsdom */
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    defaultValue?: string;
    disabled?: boolean;
  }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

/* Mock Switch which also uses Radix */
jest.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, disabled }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

describe("PrismInitiateForm", () => {
  it("renders the form title and description", () => {
    render(<PrismInitiateForm />);
    expect(screen.getByText("Request PRISM Assessment")).toBeInTheDocument();
    expect(screen.getByText(/register a user and request/i)).toBeInTheDocument();
  });

  it("renders all required text input fields", () => {
    render(<PrismInitiateForm />);
    expect(screen.getByPlaceholderText("Jane")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Smith")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("jane.smith@company.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Acme Corp")).toBeInTheDocument();
  });

  it("renders submit and clear buttons", () => {
    render(<PrismInitiateForm />);
    expect(screen.getByRole("button", { name: /request assessment/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear form/i })).toBeInTheDocument();
  });

  it("disables text inputs when disabled prop is true", () => {
    render(<PrismInitiateForm disabled />);
    expect(screen.getByPlaceholderText("Jane")).toBeDisabled();
    expect(screen.getByPlaceholderText("Smith")).toBeDisabled();
    expect(screen.getByPlaceholderText("jane.smith@company.com")).toBeDisabled();
    expect(screen.getByRole("button", { name: /request assessment/i })).toBeDisabled();
  });

  it("pre-fills default values", () => {
    render(
      <PrismInitiateForm
        defaultValues={{
          forename: "Alice",
          surname: "Wonder",
          email: "alice@test.com",
        }}
      />
    );
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Wonder")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alice@test.com")).toBeInTheDocument();
  });

  it("renders section headings", () => {
    render(<PrismInitiateForm />);
    expect(screen.getByText("Candidate Details")).toBeInTheDocument();
    expect(screen.getByText("Questionnaire Configuration")).toBeInTheDocument();
    expect(screen.getByText("PRISM Options")).toBeInTheDocument();
  });

  /* ── Submit wiring ──────────────────────────────────────────────
     Regression cover for the defect where the real pages rendered this
     form with no `onSubmit` prop, so "Request Assessment" built a payload
     and discarded it — no network call, no toast, no error. */
  describe("submit wiring", () => {
    /* The Select components are mocked out (Radix breaks in jsdom), so the
       two select-backed fields are supplied via defaultValues to get a
       schema-valid form. */
    const validDefaults = {
      forename: "Jane",
      surname: "Smith",
      email: "jane.smith@company.com",
      organisation: "Acme Corp",
      gender: "male",
      questionnaireTypeId: 4,
      languageId: 25,
    };

    beforeEach(() => {
      mockRequestSurvey.mockReset();
    });

    it("POSTs the mapped payload to the survey-request endpoint", async () => {
      mockRequestSurvey.mockResolvedValue({
        request_id: "req-1",
        action_url_1: "https://prism.example/q/abc",
        quest_status_desc: "sent",
      });

      render(<PrismInitiateForm defaultValues={validDefaults} />);
      await userEvent.click(
        screen.getByRole("button", { name: /request assessment/i })
      );

      await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalledTimes(1));
      expect(mockRequestSurvey).toHaveBeenCalledWith(
        expect.objectContaining({
          forename: "Jane",
          surname: "Smith",
          email: "jane.smith@company.com",
          organisation: "Acme Corp",
          qtype_id: 4,
          lang_id: 25,
          gender: true, // PRISM convention: true = male
          isGift: false,
        })
      );
    });

    it("shows the returned questionnaire link on success", async () => {
      mockRequestSurvey.mockResolvedValue({
        request_id: "req-1",
        action_url_1: "https://prism.example/q/abc",
        quest_status_desc: "sent",
      });

      render(<PrismInitiateForm defaultValues={validDefaults} />);
      await userEvent.click(
        screen.getByRole("button", { name: /request assessment/i })
      );

      expect(
        await screen.findByText("Assessment Request Submitted")
      ).toBeInTheDocument();
      expect(
        screen.getByText("https://prism.example/q/abc")
      ).toBeInTheDocument();
    });

    it("still confirms when PRISM returns no questionnaire link", async () => {
      mockRequestSurvey.mockResolvedValue({
        request_id: "req-1",
        action_url_1: null,
        quest_status_desc: "pending",
      });

      render(<PrismInitiateForm defaultValues={validDefaults} />);
      await userEvent.click(
        screen.getByRole("button", { name: /request assessment/i })
      );

      expect(
        await screen.findByText("Assessment Request Submitted")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/has not returned a questionnaire link yet/i)
      ).toBeInTheDocument();
    });

    it("stays on the form when the request fails", async () => {
      mockRequestSurvey.mockRejectedValue(new Error("boom"));

      render(<PrismInitiateForm defaultValues={validDefaults} />);
      await userEvent.click(
        screen.getByRole("button", { name: /request assessment/i })
      );

      await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalled());
      expect(
        screen.queryByText("Assessment Request Submitted")
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /request assessment/i })
      ).toBeInTheDocument();
    });

    it("does NOT call the API in harness mode", async () => {
      const onSubmit = jest.fn();
      render(
        <PrismInitiateForm
          defaultValues={validDefaults}
          showPayloadPreview
          onSubmit={onSubmit}
        />
      );
      await userEvent.click(
        screen.getByRole("button", { name: /request assessment/i })
      );

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(mockRequestSurvey).not.toHaveBeenCalled();
    });
  });
});
