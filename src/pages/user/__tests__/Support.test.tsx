/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Support from "@/pages/user/Support";
import { createTicket, listTickets } from "@/services/support/support.service";

jest.mock("@/services/support/support.service", () => ({
  createTicket: jest.fn(),
  listTickets: jest.fn(),
  getTicket: jest.fn(),
  updateTicket: jest.fn(),
  listMessages: jest.fn(),
  addMessage: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

/* Radix Select relies on PointerEvent / hasPointerCapture, which jsdom lacks
 * (see PrismInitiateForm.test.tsx for the same workaround). This shell keeps
 * onValueChange wired up so selecting a category still exercises form state. */
jest.mock("@/components/ui/select", () => {
  // requireActual is untyped, so the context is created without type args.
  const ReactActual = jest.requireActual("react") as typeof React;
  const Ctx = ReactActual.createContext({} as {
    onValueChange?: (v: string) => void;
  });
  return {
    __esModule: true,
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (v: string) => void;
    }) => (
      <Ctx.Provider value={{ onValueChange }}>
        <div data-testid="select">{children}</div>
      </Ctx.Provider>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
      const { onValueChange } = ReactActual.useContext(Ctx);
      return (
        <button type="button" onClick={() => onValueChange?.(value)}>
          {children}
        </button>
      );
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  };
});

// UserLayout pulls in the whole sidebar/nav tree — not under test here.
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUser = {
  id: "user-123",
  email: "dana@example.com",
  fullName: "Dana Reed",
  name: null,
  token: "t",
  role: "user",
};

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockCreateTicket = createTicket as jest.MockedFunction<typeof createTicket>;
const mockListTickets = listTickets as jest.MockedFunction<typeof listTickets>;

const CREATED = {
  id: "ticket-1",
  user_id: "user-123",
  org_id: null,
  subject: "Report export fails",
  description: "long description here",
  status: "open",
  priority: "normal",
  category: "technical",
  contact_name: "Dana Reed",
  contact_email: "dana@example.com",
  contact_phone: null,
  created_at: "2026-07-26T18:00:00Z",
  updated_at: "2026-07-26T18:00:00Z",
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Support />
    </QueryClientProvider>,
  );
}

const GOOD_DESCRIPTION =
  "When I click Export on the reports page nothing downloads. I expected a CSV file.";

beforeEach(() => {
  jest.clearAllMocks();
  mockListTickets.mockResolvedValue([]);
  mockCreateTicket.mockResolvedValue(CREATED);
});

describe("Help & Support page", () => {
  it("renders the support request form", async () => {
    renderPage();
    expect(await screen.findByText("Post a support request")).toBeInTheDocument();
  });

  it("is titled Help and Support (it is the /help surface)", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: "Help and Support" }),
    ).toBeInTheDocument();
  });

  it("keeps the Voice Help route from the previous Help page", async () => {
    renderPage();
    expect(await screen.findByText("Voice Help")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /speak with support/i }),
    ).toBeInTheDocument();
  });

  it("prefills contact name and email from the signed-in user", async () => {
    renderPage();
    expect(await screen.findByDisplayValue("Dana Reed")).toBeInTheDocument();
    expect(screen.getByDisplayValue("dana@example.com")).toBeInTheDocument();
  });

  it("tells the user their request is emailed to the support team", async () => {
    renderPage();
    expect(
      await screen.findByText(/emailed straight to the Inspire\s+Genius support team/i),
    ).toBeInTheDocument();
  });

  it("rejects a description that is too short and explains what to include", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByPlaceholderText(/Short summary/i), "Export broken");
    await user.type(screen.getByRole("textbox", { name: /describe the issue/i }), "broken");
    await user.click(screen.getByRole("button", { name: /send request/i }));

    // Matches the inline error, not the field label of similar wording.
    expect(
      await screen.findByText(/at least 30 characters/i),
    ).toBeInTheDocument();
    expect(mockCreateTicket).not.toHaveBeenCalled();
  });

  it("submits the contact block together with the issue detail", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByPlaceholderText(/Short summary/i), "Export broken");
    await user.type(
      screen.getByRole("textbox", { name: /describe the issue/i }),
      GOOD_DESCRIPTION,
    );
    await user.type(screen.getByPlaceholderText("+1 555 0100"), "+1 555 0100");

    await user.click(await screen.findByText("Technical problem"));

    await user.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => expect(mockCreateTicket).toHaveBeenCalledTimes(1));
    expect(mockCreateTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        // Older support-service deployments still require user_id and 422
        // without it; the current one ignores it in favour of the JWT.
        user_id: "user-123",
        subject: "Export broken",
        description: GOOD_DESCRIPTION,
        category: "technical",
        priority: "normal",
        contact_name: "Dana Reed",
        contact_email: "dana@example.com",
        contact_phone: "+1 555 0100",
      }),
    );
  });

  it("keeps the contact block but clears the issue fields after submitting", async () => {
    const user = userEvent.setup();
    renderPage();

    const subject = await screen.findByPlaceholderText(/Short summary/i);
    await user.type(subject, "Export broken");
    await user.type(
      screen.getByRole("textbox", { name: /describe the issue/i }),
      GOOD_DESCRIPTION,
    );
    await user.click(await screen.findByText("Technical problem"));
    await user.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => expect(mockCreateTicket).toHaveBeenCalled());
    await waitFor(() => expect(subject).toHaveValue(""));
    expect(screen.getByDisplayValue("Dana Reed")).toBeInTheDocument();
  });

  it("never filters the list by user_id (the auth context id is the literal \"me\")", async () => {
    mockListTickets.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(mockListTickets).toHaveBeenCalled());
    for (const call of mockListTickets.mock.calls) {
      expect(call[0]?.user_id).toBeUndefined();
    }
  });

  it("lists previously posted requests", async () => {
    mockListTickets.mockResolvedValue([CREATED]);
    renderPage();
    expect(await screen.findByText("Report export fails")).toBeInTheDocument();
  });

  it("shows an empty state when there are no requests", async () => {
    renderPage();
    expect(
      await screen.findByText(/have not posted any support requests yet/i),
    ).toBeInTheDocument();
  });
});
