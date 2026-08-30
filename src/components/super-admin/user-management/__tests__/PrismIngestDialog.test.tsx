import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PrismIngestDialog from "../PrismIngestDialog";
import { importPrismFile } from "@/services/prism/prism.service";

/* Mock the PRISM import service */
jest.mock("@/services/prism/prism.service", () => ({
  importPrismFile: jest.fn(),
}));

/* Mock sonner toasts */
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

/* Mock the Radix Dialog — portal content doesn't render cleanly in jsdom */
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

const mockedImport = importPrismFile as jest.MockedFunction<typeof importPrismFile>;

function renderDialog(targets: { id: string; email: string; name?: string }[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PrismIngestDialog open onOpenChange={jest.fn()} targets={targets} />
    </QueryClientProvider>,
  );
}

function fileInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input[type="file"]'));
}

describe("PrismIngestDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows single-user title and disables ingest until a file is chosen", () => {
    renderDialog([{ id: "u1", email: "a@b.com", name: "Amy B" }]);
    expect(screen.getByText("Upload PRISM report")).toBeInTheDocument();
    const ingestBtn = screen.getByRole("button", { name: /Ingest/i });
    expect(ingestBtn).toBeDisabled();
  });

  it("shows bulk title with the target count", () => {
    renderDialog([
      { id: "u1", email: "a@b.com", name: "Amy B" },
      { id: "u2", email: "c@d.com", name: "Cy D" },
    ]);
    expect(screen.getByText("Bulk ingest PRISM reports (2)")).toBeInTheDocument();
  });

  it("ingests an assigned file and marks the row Done", async () => {
    mockedImport.mockResolvedValue({ parsed_scores: { gold: 1, green: 2, blue: 3, orange: 4 } });
    const { container } = renderDialog([{ id: "u1", email: "a@b.com", name: "Amy B" }]);

    const file = new File(["gold,green\n1,2"], "amy_prism.csv", { type: "text/csv" });
    const input = fileInputs(container)[0];
    fireEvent.change(input, { target: { files: [file] } });

    const ingestBtn = screen.getByRole("button", { name: /Ingest/i });
    await waitFor(() => expect(ingestBtn).toBeEnabled());
    fireEvent.click(ingestBtn);

    await waitFor(() => expect(mockedImport).toHaveBeenCalledWith("u1", file));
    await waitFor(() => expect(screen.getByText("Done")).toBeInTheDocument());
  });

  it("marks the row Failed and surfaces the error when the import rejects", async () => {
    mockedImport.mockRejectedValue(
      Object.assign(new Error("boom"), { response: { data: { detail: "bad csv" } } }),
    );
    const { container } = renderDialog([{ id: "u9", email: "z@z.com", name: "Zed" }]);

    const file = new File(["x"], "zed_prism.csv", { type: "text/csv" });
    fireEvent.change(fileInputs(container)[0], { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /Ingest/i }));

    await waitFor(() => expect(screen.getByText("Failed")).toBeInTheDocument());
    expect(screen.getByText("bad csv")).toBeInTheDocument();
  });

  it("auto-matches a multi-file selection to users by filename", async () => {
    const { container } = renderDialog([
      { id: "u1", email: "amy@b.com", name: "Amy B" },
      { id: "u2", email: "carlos@d.com", name: "Carlos D" },
    ]);
    // The first file input is the bulk auto-match input.
    const multi = fileInputs(container)[0];
    const f1 = new File(["x"], "report_amy.csv", { type: "text/csv" });
    const f2 = new File(["y"], "carlos-prism.csv", { type: "text/csv" });
    fireEvent.change(multi, { target: { files: [f1, f2] } });

    await waitFor(() => {
      expect(screen.getByText("report_amy.csv")).toBeInTheDocument();
      expect(screen.getByText("carlos-prism.csv")).toBeInTheDocument();
    });
  });
});
