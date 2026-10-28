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

/* The caller's own practitioners, for the "share my results" option.
   `mockMine` is what each test sets; the default is "programme off". */
const mockMine = jest.fn();
jest.mock("@/hooks/prism/useMyPractitioners", () => ({
  useMyPractitioners: (opts?: { enabled?: boolean }) => mockMine(opts),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

/* The signed-in account. The default is a plain user whose email is the one the
   submit tests use, so those stay requests for the caller's OWN survey. */
const mockRole = { current: "user" };
const mockUser = { id: "u-1", email: "jane.smith@company.com", fullName: "Jane Smith", role: "user" };
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: mockUser, hasRole: (r: string) => r === mockRole.current }),
}));

/* Prior approval (2026-10-26). `mockAccess` is the GET /requests/access read;
   the default is "allowed" so the existing tests test what happens past it. */
const mockAccess = jest.fn();
const mockRefetch = jest.fn();
const mockRequestAccess = jest.fn();
jest.mock("@/hooks/prism/usePrismRequestAccess", () => ({
  usePrismRequestAccess: (opts?: { enabled?: boolean }) => mockAccess(opts),
  useRequestPrismAccess: () => ({ mutateAsync: mockRequestAccess, isPending: false }),
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
  Switch: ({ checked, onCheckedChange, disabled, "aria-label": ariaLabel }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
    disabled?: boolean;
    "aria-label"?: string;
  }) => (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

beforeEach(() => {
  mockMine.mockReturnValue({ data: { enabled: false, practitioners: [] } });
  mockRole.current = "user";
  mockAccess.mockReturnValue({ data: { allowed: true, scope: "tier", pending: false, request: null,
    message: "", account: { name: "Jane Smith", email: "jane.smith@company.com" } }, refetch: mockRefetch });
});

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

  /* Guard against the field coming back: it was mandatory until
     2026-08-20 and blocked submission on a value PRISM ignores. */
  it("does not render a gender control", () => {
    render(<PrismInitiateForm />);
    expect(screen.queryByText(/gender/i)).not.toBeInTheDocument();
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
      questionnaireTypeId: 4,
      languageId: 25,
    };

    beforeEach(() => {
      mockRequestSurvey.mockReset();
    });

    it("POSTs the mapped payload to the survey-request endpoint", async () => {
      mockRole.current = "super-admin"; // the pre-paid switch is theirs only
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
          isGift: false,
        })
      );
    });

    /* PRISM Service Library API v2.5 §5.1.2.10 defines Gender as a
       report-text switch for gendered languages, not a scoring input, and
       IG runs English. The form no longer collects it, so the payload must
       not carry it either — omitting the key lets the backend default
       (`CreateRequestBody.gender = False`) apply. objectContaining above
       would happily pass with a stray `gender`, so assert its absence. */
    it("does not send gender in the payload", async () => {
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
      expect(mockRequestSurvey.mock.calls[0][0]).not.toHaveProperty("gender");
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

    /* PC-1b — the server resolves the practitioner; it only asks when the
       client has several, and only among their own. */
    const choice409 = {
      response: {
        status: 409,
        data: {
          detail: {
            code: "practitioner_choice_required",
            message: "choose",
            practitioners: [
              { practitionerSub: "p-a", displayName: "Avery Coach" },
              { practitionerSub: "p-b", displayName: "Blake Coach" },
            ],
          },
        },
      },
    };

    it("asks which of their own practitioners when the server says there are several", async () => {
      mockRequestSurvey.mockRejectedValueOnce(choice409);
      const { toast } = jest.requireMock("sonner");
      toast.error.mockClear();

      render(<PrismInitiateForm defaultValues={validDefaults} />);
      await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));

      expect(await screen.findByText(/which practitioner is this assessment for/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Avery Coach")).toBeInTheDocument();
      expect(screen.getByLabelText("Blake Coach")).toBeInTheDocument();
      // A question, not a failure.
      expect(toast.error).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /request under this practitioner/i })).toBeDisabled();
    });

    it("re-sends the same request with the chosen practitioner", async () => {
      mockRequestSurvey
        .mockRejectedValueOnce(choice409)
        .mockResolvedValueOnce({ request_id: "r", action_url_1: "https://prism.example/q/b", quest_status_desc: "sent" });

      render(<PrismInitiateForm defaultValues={validDefaults} />);
      await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
      await userEvent.click(await screen.findByLabelText("Blake Coach"));
      await userEvent.click(screen.getByRole("button", { name: /request under this practitioner/i }));

      await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalledTimes(2));
      expect(mockRequestSurvey.mock.calls[0][0]).not.toHaveProperty("practitionerSub");
      expect(mockRequestSurvey.mock.calls[1][0]).toEqual(
        expect.objectContaining({ practitionerSub: "p-b", forename: "Jane", qtype_id: 4 })
      );
      expect(await screen.findByText("Assessment Request Submitted")).toBeInTheDocument();
    });

    it("never toasts a structured error detail as [object Object]", async () => {
      mockRequestSurvey.mockRejectedValueOnce({
        message: "Request failed with status code 409",
        response: { status: 409, data: { detail: { code: "something_else" } } },
      });
      const { toast } = jest.requireMock("sonner");
      toast.error.mockClear();

      render(<PrismInitiateForm defaultValues={validDefaults} />);
      await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
      expect(toast.error.mock.calls[0][0]).not.toContain("[object Object]");
      expect(toast.error.mock.calls[0][0]).toContain("status code 409");
      expect(screen.queryByText(/which practitioner/i)).not.toBeInTheDocument();
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

  describe("share my results with my practitioner", () => {
    const validDefaults = {
      forename: "Jane",
      surname: "Smith",
      email: "jane.smith@company.com",
      organisation: "Acme Corp",
      questionnaireTypeId: 4,
      languageId: 25,
    };
    const ok = { request_id: "r", action_url_1: "https://prism.example/q/a", quest_status_desc: "sent" };
    const one = { data: { enabled: true, practitioners: [{ practitionerSub: "p-a", displayName: "Avery Coach" }] } };
    const two = { data: { enabled: true, practitioners: [
      { practitionerSub: "p-a", displayName: "Avery Coach" },
      { practitionerSub: "p-b", displayName: "Blake Coach" },
    ] } };

    beforeEach(() => mockRequestSurvey.mockReset());

    it.each([
      ["the programme is off", { data: { enabled: false, practitioners: [] } }],
      ["the programme is off, whatever else comes back", {
        data: { enabled: false, practitioners: [{ practitionerSub: "p-a", displayName: "Avery Coach" }] },
      }],
      ["they have no practitioner", { data: { enabled: true, practitioners: [] } }],
      ["the read failed", { data: undefined, isError: true }],
    ])("is not offered when %s", (_label, value) => {
      mockMine.mockReturnValue(value);
      render(<PrismInitiateForm defaultValues={validDefaults} />);
      expect(screen.queryByRole("switch", { name: /share my results/i })).toBeNull();
    });

    it("names the one practitioner and is off by default", async () => {
      mockMine.mockReturnValue(one);
      mockRequestSurvey.mockResolvedValue(ok);
      render(<PrismInitiateForm defaultValues={validDefaults} />);
      const tick = screen.getByRole("switch", { name: "Share my results with Avery Coach" });
      expect(tick).toHaveAttribute("aria-checked", "false");
      await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
      await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalledTimes(1));
      expect(mockRequestSurvey.mock.calls[0][0]).not.toHaveProperty("shareWithPractitioner");
    });

    it("sends the tick when it is on", async () => {
      mockMine.mockReturnValue(one);
      mockRequestSurvey.mockResolvedValue(ok);
      render(<PrismInitiateForm defaultValues={validDefaults} />);
      await userEvent.click(screen.getByRole("switch", { name: "Share my results with Avery Coach" }));
      await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
      await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalledTimes(1));
      expect(mockRequestSurvey.mock.calls[0][0]).toEqual(
        expect.objectContaining({ shareWithPractitioner: true })
      );
    });

    it("with several, says the one they choose and carries the tick through the choice", async () => {
      mockMine.mockReturnValue(two);
      mockRequestSurvey
        .mockRejectedValueOnce({ response: { status: 409, data: { detail: {
          code: "practitioner_choice_required",
          practitioners: two.data.practitioners,
        } } } })
        .mockResolvedValueOnce(ok);
      render(<PrismInitiateForm defaultValues={validDefaults} />);
      await userEvent.click(
        screen.getByRole("switch", { name: "Share my results with the practitioner I choose" })
      );
      await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
      await userEvent.click(await screen.findByLabelText("Blake Coach"));
      await userEvent.click(screen.getByRole("button", { name: /request under this practitioner/i }));
      await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalledTimes(2));
      expect(mockRequestSurvey.mock.calls[1][0]).toEqual(
        expect.objectContaining({ practitionerSub: "p-b", shareWithPractitioner: true })
      );
    });

    it("does not read the practitioners in harness mode", () => {
      render(<PrismInitiateForm defaultValues={validDefaults} showPayloadPreview />);
      expect(mockMine).toHaveBeenCalledWith({ enabled: false });
    });
  });
});


/* ── Prior approval, pre-paid and someone else's email (2026-10-26) ── */
describe("PRISM survey requests need prior approval", () => {
  const D2 =
    "All Requests for Surveys need prior Approval. Please provide your name and the " +
    "name of the PRISM Practitioner who provided access to the site. A notification " +
    "will be sent to Admin@inspiresgenius.com";
  const valid = {
    forename: "Jane",
    surname: "Smith",
    email: "jane.smith@company.com",
    organisation: "Acme Corp",
    questionnaireTypeId: 4,
    languageId: 25,
  };
  const ok = { request_id: "r", action_url_1: "https://prism.example/q/a", quest_status_desc: "sent" };
  const blockedState = {
    allowed: false, scope: null, pending: false, request: null, message: D2,
    account: { name: "Jane Smith", email: "jane.smith@company.com" },
  };

  beforeEach(() => {
    mockRequestSurvey.mockReset();
    mockRefetch.mockReset();
  });

  it("a blocked caller sees the notice and cannot submit", () => {
    mockAccess.mockReturnValue({ data: blockedState, refetch: mockRefetch });
    render(<PrismInitiateForm defaultValues={valid} />);
    expect(screen.getByText(D2)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request access/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request assessment/i })).toBeDisabled();
    expect(screen.getByPlaceholderText("Jane")).toBeDisabled();
  });

  it("while the access read is loading or failed, the form is usable", () => {
    mockAccess.mockReturnValue({ data: undefined, isError: true, refetch: mockRefetch });
    render(<PrismInitiateForm defaultValues={valid} />);
    expect(screen.queryByText(D2)).toBeNull();
    expect(screen.getByRole("button", { name: /request assessment/i })).toBeEnabled();
  });

  it("the harness never reads access and is never blocked", () => {
    mockAccess.mockReturnValue({ data: blockedState, refetch: mockRefetch });
    render(<PrismInitiateForm defaultValues={valid} showPayloadPreview />);
    expect(mockAccess).toHaveBeenCalledWith({ enabled: false });
    expect(screen.queryByText(D2)).toBeNull();
  });

  it("a 403 approval refusal shows the notice and its dialog, not an error toast", async () => {
    const { toast } = jest.requireMock("sonner");
    toast.error.mockClear();
    mockRequestSurvey.mockRejectedValueOnce({
      response: { status: 403, data: { detail: { code: "prism_request_approval_required", message: D2 } } },
    });
    render(<PrismInitiateForm defaultValues={valid} />);
    await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText(D2).length).toBeGreaterThan(0);
    expect(toast.error).not.toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("a structured error message reaches the toast as text", async () => {
    const { toast } = jest.requireMock("sonner");
    toast.error.mockClear();
    mockRequestSurvey.mockRejectedValueOnce({
      response: { status: 403, data: { detail: { code: "prepaid_not_permitted", message: "Only a super-admin can mark a PRISM survey as pre-paid." } } },
    });
    render(<PrismInitiateForm defaultValues={valid} />);
    await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error.mock.calls[0][0]).toContain("Only a super-admin");
  });

  it("the pre-paid switch is not offered to a non-super-admin, and is never sent true", async () => {
    mockRequestSurvey.mockResolvedValue(ok);
    render(<PrismInitiateForm defaultValues={{ ...valid, isGift: true }} />);
    expect(screen.queryByText("Gift / Pre-paid")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
    await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalledTimes(1));
    expect(mockRequestSurvey.mock.calls[0][0].isGift).toBe(false);
  });

  it("a super-admin sees the pre-paid switch and can send it", async () => {
    mockRole.current = "super-admin";
    mockRequestSurvey.mockResolvedValue(ok);
    render(<PrismInitiateForm defaultValues={{ ...valid, isGift: true }} />);
    expect(screen.getByText("Gift / Pre-paid")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
    await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalledTimes(1));
    expect(mockRequestSurvey.mock.calls[0][0].isGift).toBe(true);
  });

  it("the caller's own email (any case) asks for no practitioner", async () => {
    mockRequestSurvey.mockResolvedValue(ok);
    render(<PrismInitiateForm defaultValues={{ ...valid, email: "Jane.Smith@Company.com" }} />);
    expect(screen.queryByText(/practitioner who authorised it/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
    await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalledTimes(1));
    expect(mockRequestSurvey.mock.calls[0][0]).not.toHaveProperty("practitionerName");
  });

  it("another email needs the practitioner named and confirmed before it is sent", async () => {
    mockRequestSurvey.mockResolvedValue(ok);
    render(<PrismInitiateForm defaultValues={{ ...valid, email: "someone.else@company.com" }} />);
    expect(screen.getByText(/not your account/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
    expect(await screen.findByText(/Name the PRISM Practitioner/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm the practitioner authorised it/i)).toBeInTheDocument();
    expect(mockRequestSurvey).not.toHaveBeenCalled();

    await userEvent.type(screen.getByPlaceholderText("Practitioner's name"), "Dr Prac");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /request assessment/i }));
    await waitFor(() => expect(mockRequestSurvey).toHaveBeenCalledTimes(1));
    expect(mockRequestSurvey.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        email: "someone.else@company.com",
        practitionerName: "Dr Prac",
        practitionerConfirmed: true,
      })
    );
  });
});
