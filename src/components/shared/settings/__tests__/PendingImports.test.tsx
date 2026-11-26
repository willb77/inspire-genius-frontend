/**
 * @jest-environment jsdom
 *
 * TDS A4 — "Waiting for you": results a practitioner sent, held until the
 * person answers. These tests try to disprove that: Accept calls the accept
 * route and Decline the remove (never the other way round); Decline asks
 * first; a refusal is shown in the server's words; a failed read says so;
 * and nothing waiting shows nothing.
 */
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

import PendingImports from "@/components/shared/settings/PendingImports";
import {
  pendingResultText,
  pendingRouteMissing,
  resetPendingRouteWarningForTests,
} from "@/components/shared/settings/onFileHelpers";
import {
  acceptPendingImport,
  listPendingImports,
  removeAssessment,
} from "@/services/profile/profile";
import type { PendingImport } from "@/types/profile/profile-types";

jest.mock("@/services/profile/profile", () => ({
  listPendingImports: jest.fn(),
  acceptPendingImport: jest.fn(),
  removeAssessment: jest.fn(),
  getMyProfile: jest.fn(),
  listAssessments: jest.fn(),
  getLoadedFrameworks: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const CLIFTON: PendingImport = {
  id: "p-clifton",
  framework: "CLIFTON",
  imported_at: "2026-11-25T15:00:00Z",
  imported_by: "prac-1",
  imported_by_name: "Pat Practitioner",
  scores: [
    { category: "Themes", dimension: "Learner", score_text: "Learner", rank: 2 },
    { category: "Themes", dimension: "Achiever", score_text: "Achiever", rank: 1 },
  ],
};

const DISC: PendingImport = {
  id: "p-disc",
  framework: "DISC",
  imported_at: "2026-11-24T15:00:00Z",
  imported_by: null,
  imported_by_name: null,
  scores: [
    { category: "DISC", dimension: "D", score_numeric: 70 },
    { category: "DISC", dimension: "I", score_numeric: 40 },
  ],
};

const httpError = (status: number, detail?: string) => ({ response: { status, data: detail ? { detail } : {} } });

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 }, mutations: { retry: false } },
  });
  const view = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...view, client };
}

/**
 * Wait until the waiting-list read has finished. Loading also renders nothing,
 * so "shows nothing" asserted before this would pass on the loading state.
 */
async function settled(client: QueryClient): Promise<void> {
  await waitFor(() => {
    const q = client.getQueryCache().findAll({ queryKey: ["profile", "pending"] })[0];
    expect(q?.state.status === "success" || q?.state.status === "error").toBe(true);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (listPendingImports as jest.Mock).mockResolvedValue([CLIFTON, DISC]);
  (acceptPendingImport as jest.Mock).mockResolvedValue({ id: "p-clifton", is_authoritative: true });
  (removeAssessment as jest.Mock).mockResolvedValue({ id: "p-clifton", is_authoritative: false });
});

describe("what is listed", () => {
  it("each waiting result: who sent it, which assessment, and the result itself", async () => {
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-clifton");
    expect(row).toHaveTextContent("Pat Practitioner sent you a CliftonStrengths result on");
    // Ranked, as the "On file" line shows them.
    expect(row).toHaveTextContent("Achiever, Learner");
    expect(row).toHaveTextContent("It is not used until you accept it.");
    expect(screen.getByRole("region", { name: "Waiting for you" })).toBeInTheDocument();
  });

  it("an importer with no name on file reads as 'Your practitioner', never an id", async () => {
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-disc");
    expect(row).toHaveTextContent("Your practitioner sent you a DISC result on");
    expect(row).toHaveTextContent("D 70 · I 40");
  });

  it("nothing waiting shows nothing", async () => {
    (listPendingImports as jest.Mock).mockResolvedValue([]);
    const { container, client } = wrap(<PendingImports />);
    await settled(client);
    expect(container).toBeEmptyDOMElement();
  });

  it("a failed read says so; it never reads as nothing waiting", async () => {
    (listPendingImports as jest.Mock).mockRejectedValue(httpError(500));
    wrap(<PendingImports />);
    expect(await screen.findByTestId("pending-error")).toHaveTextContent(
      "We could not check for results sent to you.",
    );
  });

  it("an engine without the route (404) leaves the list out rather than erroring everyone's Settings", async () => {
    (listPendingImports as jest.Mock).mockRejectedValue(httpError(404));
    const { container, client } = wrap(<PendingImports />);
    await settled(client);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Accept", () => {
  it("calls the accept route with that result's id (not the remove), then refreshes the list", async () => {
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-clifton");
    fireEvent.click(within(row).getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(acceptPendingImport).toHaveBeenCalledWith("p-clifton"));
    expect(removeAssessment).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Accepted. This is now your current CliftonStrengths result."),
    );
    await waitFor(() => expect(listPendingImports).toHaveBeenCalledTimes(2));
  });

  it("a 409 (answered elsewhere) is said in the server's words and the list catches up", async () => {
    (acceptPendingImport as jest.Mock).mockRejectedValue(httpError(409, "You declined this result"));
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-clifton");
    fireEvent.click(within(row).getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("You declined this result"));
    await waitFor(() => expect(listPendingImports).toHaveBeenCalledTimes(2));
  });

  it("any other refusal is shown on the row in the server's words", async () => {
    (acceptPendingImport as jest.Mock).mockRejectedValue(
      httpError(403, "Only a result a practitioner sent you can be accepted"),
    );
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-clifton");
    fireEvent.click(within(row).getByRole("button", { name: "Accept" }));
    expect(await within(row).findByRole("alert")).toHaveTextContent(
      "Only a result a practitioner sent you can be accepted",
    );
  });

  it("a refusal with no words falls back to a plain failure, never silence", async () => {
    (acceptPendingImport as jest.Mock).mockRejectedValue(new Error("network"));
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-clifton");
    fireEvent.click(within(row).getByRole("button", { name: "Accept" }));
    expect(await within(row).findByRole("alert")).toHaveTextContent("We could not accept this result.");
  });
});

describe("Decline", () => {
  it("asks first; Cancel sends nothing", async () => {
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-disc");
    fireEvent.click(within(row).getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByTestId("decline-pending-dialog");
    expect(dialog).toHaveTextContent("Decline this DISC result?");
    expect(dialog).toHaveTextContent("you cannot accept it later");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(removeAssessment).not.toHaveBeenCalled();
    expect(acceptPendingImport).not.toHaveBeenCalled();
  });

  it("confirmed, it calls the remove with that result's id (not the accept)", async () => {
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-disc");
    fireEvent.click(within(row).getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByTestId("decline-pending-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
    await waitFor(() => expect(removeAssessment).toHaveBeenCalledWith("p-disc"));
    expect(acceptPendingImport).not.toHaveBeenCalled();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Declined. The DISC result was not added."));
  });

  it("a refusal is shown on the row in the server's words", async () => {
    (removeAssessment as jest.Mock).mockRejectedValue(httpError(403, "This result cannot be removed"));
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-disc");
    fireEvent.click(within(row).getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByTestId("decline-pending-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
    expect(await within(row).findByRole("alert")).toHaveTextContent("This result cannot be removed");
  });

  it("a 409 (answered elsewhere) closes the question and says so", async () => {
    (removeAssessment as jest.Mock).mockRejectedValue(httpError(409));
    wrap(<PendingImports />);
    const row = await screen.findByTestId("pending-p-disc");
    fireEvent.click(within(row).getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByTestId("decline-pending-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("That result has already been answered."));
  });
});

describe("helpers", () => {
  it("pendingRouteMissing is true for a 404 only", () => {
    expect(pendingRouteMissing(httpError(404))).toBe(true);
    for (const s of [400, 401, 403, 409, 500]) expect(pendingRouteMissing(httpError(s))).toBe(false);
    expect(pendingRouteMissing(new Error("network"))).toBe(false);
  });

  it("pendingResultText ranks CliftonStrengths themes", () => {
    expect(pendingResultText(CLIFTON)).toBe("Achiever, Learner");
  });
});

describe("a 404 is hidden from the person, but not from us", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    resetPendingRouteWarningForTests();
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  const warned = () =>
    warn.mock.calls.filter((c) => String(c[0]).includes("pending imports route not deployed on this tier"));

  it("warns exactly once, naming the route, across two mounts and a refetch", async () => {
    (listPendingImports as jest.Mock).mockRejectedValue(httpError(404));
    const first = wrap(<PendingImports />);
    await settled(first.client);
    await waitFor(() => expect(warned()).toHaveLength(1));
    expect(String(warned()[0][0])).toContain("/v1/profile/me/assessments/pending");

    // A refetch that 404s again.
    await first.client.refetchQueries({ queryKey: ["profile", "pending"] });
    first.unmount();

    // A second mount on a fresh cache (Settings opened again).
    const second = wrap(<PendingImports />);
    await settled(second.client);
    await waitFor(() => expect(listPendingImports).toHaveBeenCalledTimes(3));
    expect(second.container).toBeEmptyDOMElement();
    expect(warned()).toHaveLength(1);
  });

  it("any other failed read does not warn and does show its error", async () => {
    (listPendingImports as jest.Mock).mockRejectedValue(httpError(500));
    const { client } = wrap(<PendingImports />);
    await settled(client);
    expect(await screen.findByTestId("pending-error")).toBeInTheDocument();
    expect(warned()).toHaveLength(0);
  });
});
