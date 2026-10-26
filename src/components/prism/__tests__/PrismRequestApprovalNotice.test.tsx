import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrismRequestApprovalNotice } from "../PrismRequestApprovalNotice";
import type { PrismRequestAccessState } from "@/services/prism/prism";

const mockRequestAccess = jest.fn();
jest.mock("@/hooks/prism/usePrismRequestAccess", () => ({
  useRequestPrismAccess: () => ({ mutateAsync: mockRequestAccess, isPending: false }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const D2 =
  "All Requests for Surveys need prior Approval. Please provide your name and the " +
  "name of the PRISM Practitioner who provided access to the site. A notification " +
  "will be sent to Admin@inspiresgenius.com";

const blocked: PrismRequestAccessState = {
  allowed: false,
  scope: null,
  pending: false,
  request: null,
  message: D2,
  account: { name: "Pat Person", email: "pat.person@example.com" },
};

beforeEach(() => mockRequestAccess.mockReset());

describe("PrismRequestApprovalNotice", () => {
  it("shows the decided message, verbatim", () => {
    render(<PrismRequestApprovalNotice state={blocked} fallbackAccount={{ name: "", email: "" }} />);
    expect(screen.getByText(D2)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request access/i })).toBeInTheDocument();
  });

  it("shows the account's name and email read-only, from the server", async () => {
    render(
      <PrismRequestApprovalNotice
        state={blocked}
        fallbackAccount={{ name: "Signed In", email: "signed.in@example.com" }}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /request access/i }));
    const name = screen.getByLabelText("Your name") as HTMLInputElement;
    const email = screen.getByLabelText("Your email") as HTMLInputElement;
    expect(name.value).toBe("Pat Person");
    expect(email.value).toBe("pat.person@example.com");
    expect(name).toHaveAttribute("readonly");
    expect(email).toHaveAttribute("readonly");
  });

  it("falls back to the signed-in account before the server is read", async () => {
    render(
      <PrismRequestApprovalNotice
        state={null}
        fallbackAccount={{ name: "Signed In", email: "signed.in@example.com" }}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /request access/i }));
    expect((screen.getByLabelText("Your email") as HTMLInputElement).value).toBe(
      "signed.in@example.com"
    );
  });

  it("needs the confirmation and the practitioner before it sends", async () => {
    render(<PrismRequestApprovalNotice state={blocked} fallbackAccount={{ name: "", email: "" }} />);
    await userEvent.click(screen.getByRole("button", { name: /request access/i }));
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    expect(await screen.findByText("Confirm that this is you")).toBeInTheDocument();
    expect(screen.getByText(/Enter the name of the PRISM Practitioner/i)).toBeInTheDocument();
    expect(mockRequestAccess).not.toHaveBeenCalled();
  });

  it("sends the practitioner and the confirmation, never a name or email", async () => {
    mockRequestAccess.mockResolvedValue({ ...blocked, pending: true });
    render(<PrismRequestApprovalNotice state={blocked} fallbackAccount={{ name: "", email: "" }} />);
    await userEvent.click(screen.getByRole("button", { name: /request access/i }));
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByPlaceholderText("Practitioner's name"), "Dr Prac");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    await waitFor(() => expect(mockRequestAccess).toHaveBeenCalledTimes(1));
    expect(mockRequestAccess).toHaveBeenCalledWith({ practitionerName: "Dr Prac", confirmIsMe: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("renders a failed send instead of discarding it", async () => {
    mockRequestAccess.mockRejectedValue({
      response: { status: 503, data: { detail: "Approval requests are not available yet." } },
    });
    render(<PrismRequestApprovalNotice state={blocked} fallbackAccount={{ name: "", email: "" }} />);
    await userEvent.click(screen.getByRole("button", { name: /request access/i }));
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByPlaceholderText("Practitioner's name"), "Dr Prac");
    await userEvent.click(screen.getByRole("button", { name: /send request/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not available yet");
  });

  it("a pending request shows its status and offers no second request", () => {
    render(
      <PrismRequestApprovalNotice
        state={{
          ...blocked,
          pending: true,
          request: {
            id: "r1", status: "requested", practitioner_name: "Dr Prac",
            requested_at: "2026-10-26T18:00:00Z", decided_at: null,
          },
        }}
        fallbackAccount={{ name: "", email: "" }}
        defaultOpen
      />
    );
    expect(screen.getByText(/waiting for approval/i)).toHaveTextContent("Dr Prac");
    expect(screen.queryByRole("button", { name: /request access/i })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a denied request says so and lets them ask again", () => {
    render(
      <PrismRequestApprovalNotice
        state={{
          ...blocked,
          request: {
            id: "r1", status: "denied", practitioner_name: "Dr Prac",
            requested_at: "2026-10-26T18:00:00Z", decided_at: "2026-10-27T18:00:00Z",
          },
        }}
        fallbackAccount={{ name: "", email: "" }}
      />
    );
    expect(screen.getByText(/was not approved/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request access/i })).toBeInTheDocument();
  });

  it("opens straight away after a refusal", () => {
    render(<PrismRequestApprovalNotice state={blocked} fallbackAccount={{ name: "", email: "" }} defaultOpen />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
