import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PrismIngestDialog from "../PrismIngestDialog";

jest.mock("@/services/prism/prism.service", () => ({ importPrismFile: jest.fn() }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

const mutate = jest.fn();
jest.mock("@/hooks/prism/usePrismReportDownload", () => ({
  useAdminDeletePrismScores: () => ({ mutate, isPending: false }),
}));

function renderDialog(targets: { id: string; email: string; name?: string }[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PrismIngestDialog open onOpenChange={jest.fn()} targets={targets} />
    </QueryClientProvider>,
  );
}

const amy = { id: "u1", email: "Amy.B@example.com", name: "Amy B" };

describe("PrismIngestDialog — Delete PRISM scores (PRISM-RR D3/D5)", () => {
  beforeEach(() => mutate.mockReset());

  it("offers Delete for one user and never in bulk", () => {
    const { unmount } = renderDialog([amy]);
    expect(screen.getByTestId("prism-scores-delete-open")).toBeInTheDocument();
    unmount();
    renderDialog([amy, { id: "u2", email: "c.d@example.com" }]);
    expect(screen.queryByTestId("prism-scores-delete-open")).not.toBeInTheDocument();
  });

  it("says the PDF is kept and the delete cannot be undone", () => {
    renderDialog([amy]);
    fireEvent.click(screen.getByTestId("prism-scores-delete-open"));
    const box = screen.getByTestId("prism-scores-delete-confirm");
    expect(box).toHaveTextContent(/report PDF is kept/);
    expect(box).toHaveTextContent(/cannot be undone/);
  });

  it("deletes only after the user's email is typed (case and spaces ignored)", () => {
    renderDialog([amy]);
    fireEvent.click(screen.getByTestId("prism-scores-delete-open"));
    const submit = screen.getByTestId("prism-scores-delete-submit");
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId("prism-scores-delete-email"), { target: { value: "someone.else@example.com" } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId("prism-scores-delete-email"), { target: { value: "  amy.b@EXAMPLE.com " } });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ userId: "u1" });
  });

  it("Cancel backs out without deleting", () => {
    renderDialog([amy]);
    fireEvent.click(screen.getByTestId("prism-scores-delete-open"));
    fireEvent.click(within(screen.getByTestId("prism-scores-delete-confirm")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("prism-scores-delete-confirm")).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
