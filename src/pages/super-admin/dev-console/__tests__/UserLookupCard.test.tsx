/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { LookupResultView, UserLookupCard } from "@/pages/super-admin/dev-console/UserLookupCard";
import { lookupVisible } from "@/pages/super-admin/dev-console/devConsoleView";
import * as svc from "@/services/dev-console/devConsole.service";
import { ME, apiError } from "@/test/devConsoleFixtures";
import type { DevConsoleMe, UserLookupCard as Result } from "@/types/devConsole";

jest.mock("react-i18next", () => jest.requireActual("@/test/devConsoleI18nMock").reactI18nextMock);
jest.mock("@/services/dev-console/devConsole.service");
jest.mock("@/lib/devConsoleApi", () => ({ isDevConsoleConfigured: () => true }));

const m = svc as jest.Mocked<typeof svc>;

const GRANTED: DevConsoleMe = { ...ME, lookup: { granted: true, enabled: true } };

const FOUND: Result = {
  found: true,
  not_found_means: null,
  account: {
    user_id: "00000000-0000-0000-0000-000000000001",
    is_active: true,
    is_deleted: false,
    account_created_at: "2026-09-01T10:00:00+00:00",
    role_name: "user",
    org_id: null,
    org_name: "Example Org",
    is_profile_complete: true,
    entitlement_rows: [
      { matched_by: "user_id", verticals: ["lumen"], updated_at: "2026-09-02T00:00:00+00:00" },
      { matched_by: "email", verticals: ["grant"], updated_at: "2026-08-02T00:00:00+00:00" },
    ],
    entitlement_conflict: true,
    last_login_at: "2026-10-10T08:00:00+00:00",
    logins_30d: 4,
    last_chat_retained_at: null,
    chats_retained: 0,
    prism_results: 1,
    prism_latest_at: "2026-09-05T00:00:00+00:00",
    documents_uploaded: 2,
    documents_as_subject: 0,
    duplicate_accounts: false,
  },
  cognito: { present: true, status: "CONFIRMED", enabled: true, is_onboarded: "true" },
  lockout: { failed_attempts: 2, locked: false, limit: 5, window_minutes: 15 },
  magic_link_send: "not available",
  checks_run: ["account", "cognito", "lockout"],
  unavailable: [],
};

const NOT_FOUND: Result = {
  ...FOUND,
  found: false,
  account: null,
  cognito: null,
  not_found_means: "No account with this email: never created, or deleted (deletion removes the account entirely).",
  checks_run: ["account", "lockout"],
};

function renderCard(me: DevConsoleMe = GRANTED) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UserLookupCard me={me} />
    </QueryClientProvider>
  );
}

async function look(email = "person@example.com") {
  await userEvent.type(screen.getByRole("textbox", { name: "Email address" }), email);
  await userEvent.click(screen.getByRole("button", { name: "Look up" }));
}

beforeEach(() => jest.resetAllMocks());

describe("visibility", () => {
  it.each([
    ["no lookup field (older backend)", { ...ME }],
    ["not granted", { ...ME, lookup: { granted: false, enabled: true } }],
    ["switched off", { ...ME, lookup: { granted: true, enabled: false } }],
    ["console switched off", { ...GRANTED, enabled: false }],
  ])("hidden when %s", (_label, me) => {
    expect(lookupVisible(me as DevConsoleMe)).toBe(false);
    const { container } = renderCard(me as DevConsoleMe);
    expect(container).toBeEmptyDOMElement();
  });

  it("shown only when granted and enabled", () => {
    expect(lookupVisible(GRANTED)).toBe(true);
    renderCard();
    expect(screen.getByRole("heading", { name: "User lookup" })).toBeInTheDocument();
  });
});

describe("the lookup", () => {
  it("sends the email and shows the card", async () => {
    m.lookupUser.mockResolvedValue(FOUND);
    renderCard();
    await look();
    await waitFor(() => expect(m.lookupUser).toHaveBeenCalledWith("person@example.com"));
    expect(await screen.findByText("Organization: Example Org")).toBeInTheDocument();
    expect(screen.getByText("Status: CONFIRMED")).toBeInTheDocument();
    expect(screen.getByText("2 failed attempts in the last 15 minutes; locked at 5.")).toBeInTheDocument();
  });

  it("refuses a bad email without calling the server", async () => {
    renderCard();
    await look("not-an-email");
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(m.lookupUser).not.toHaveBeenCalled();
  });

  it("renders a server refusal as an alert", async () => {
    m.lookupUser.mockRejectedValue(apiError(429, "RATE_LIMITED", "30 lookups an hour"));
    renderCard();
    await look();
    expect(await screen.findByText("That is the hourly lookup limit. Try again next hour.")).toBeInTheDocument();
  });
});

describe("honest states", () => {
  const view = (r: Result) => render(<LookupResultView result={r} />);

  it("no account says never created or deleted, never 'never registered'", () => {
    view(NOT_FOUND);
    expect(screen.getByText(/never created, or deleted/)).toBeInTheDocument();
    expect(screen.queryByText(/never registered/i)).not.toBeInTheDocument();
  });

  it("every matching entitlement row is shown, with the conflict named", () => {
    view(FOUND);
    expect(screen.getByRole("alert")).toHaveTextContent("More than one entitlement row matches");
    expect(screen.getByText(/"lumen"/)).toBeInTheDocument();
    expect(screen.getByText(/"grant"/)).toBeInTheDocument();
  });

  it("a check that could not run says so instead of looking empty", () => {
    view({ ...NOT_FOUND, unavailable: ["account"], checks_run: ["lockout"] });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not be checked: account");
    // An unrun account check must not read as "no account".
    expect(screen.queryByText(/never created, or deleted/)).not.toBeInTheDocument();
  });

  it("an unrun Cognito check hides the Cognito section rather than saying 'no record'", () => {
    view({ ...FOUND, cognito: null, unavailable: ["cognito"], checks_run: ["account", "lockout"] });
    expect(screen.getByText("Could not be checked: cognito")).toBeInTheDocument();
    expect(screen.queryByText("No Cognito sign-in record for this account.")).not.toBeInTheDocument();
  });

  it("chats are labelled as retained, and an empty one reads 'none recorded'", () => {
    view(FOUND);
    expect(screen.getByText("Last chat still retained: none recorded")).toBeInTheDocument();
  });

  it("the onboarded flag carries the magic-link caveat", () => {
    view(FOUND);
    expect(screen.getByText(/Every magic-link sign-in sets this flag to true/)).toBeInTheDocument();
  });

  it("a locked account says how it clears", () => {
    view({ ...FOUND, lockout: { failed_attempts: 5, locked: true, limit: 5, window_minutes: 15 } });
    expect(screen.getByText("Locked out. It clears after a successful sign-in.")).toBeInTheDocument();
  });

  it("a deleted account says deleted, not deactivated", () => {
    view({ ...FOUND, account: { ...(FOUND.account as NonNullable<Result["account"]>), is_active: false, is_deleted: true } });
    expect(screen.getByText(/^Deleted/)).toBeInTheDocument();
  });
});
