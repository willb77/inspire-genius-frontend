import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AddPersonalDocModal } from "@/components/dashboard/v2/AddPersonalDocModal";

const mutate = jest.fn();
jest.mock("@/hooks/documents/useDocumentUpload", () => ({
  useDocumentUpload: () => ({ mutate, reset: jest.fn(), isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const RESUME = { name: "Resume", docKind: "resume" };

describe("AddPersonalDocModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the title for the target", () => {
    wrap(<AddPersonalDocModal target={RESUME} onOpenChange={jest.fn()} />);
    expect(screen.getByText("Add Resume")).toBeInTheDocument();
  });

  it("keeps upload disabled until a file is chosen", () => {
    wrap(<AddPersonalDocModal target={RESUME} onOpenChange={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: /Upload & add/i }),
    ).toBeDisabled();
  });

  it("uploads the chosen file tagged with the doc_kind", async () => {
    wrap(<AddPersonalDocModal target={RESUME} onOpenChange={jest.fn()} />);
    const file = new File(["my resume text"], "resume.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const btn = screen.getByRole("button", { name: /Upload & add/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ file, docKind: "resume" }),
        expect.anything(),
      ),
    );
  });

  it("a file the virus scan refused shows the reason, not the generic error (DOC-AV-1)", async () => {
    const { DocumentRejectedError } = jest.requireActual("@/lib/documents/scan");
    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock; success: jest.Mock } };
    mutate.mockImplementationOnce((_vars, opts) =>
      opts.onError(new DocumentRejectedError("A threat was found in this file")),
    );
    wrap(<AddPersonalDocModal target={RESUME} onOpenChange={jest.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "resume.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByRole("button", { name: /Upload & add/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("This file wasn't accepted: A threat was found in this file"),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("renders nothing interactable when target is null", () => {
    wrap(<AddPersonalDocModal target={null} onOpenChange={jest.fn()} />);
    expect(screen.queryByText(/Upload & add/i)).not.toBeInTheDocument();
  });
});
