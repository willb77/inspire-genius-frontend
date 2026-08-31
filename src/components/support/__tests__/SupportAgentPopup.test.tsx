/**
 * SupportAgentPopup tests.
 *
 * The point of this component is that "Speak with Support" reaches Meridian
 * instead of the inert VoiceDeskAI iframe, so the load-bearing assertion is
 * that sending routes through `useMeridianJob.startJob` — the same async-jobs
 * path the main chat page uses. The rest covers the popup's own contract:
 * render gating, Enter-to-send, and export.
 */
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

import SupportAgentPopup from "../SupportAgentPopup";

const startJob = jest.fn();
let settleJob: ((job: unknown) => void) | undefined;

jest.mock("@/hooks/agents/useMeridianJob", () => ({
  useMeridianJob: (opts: { onJobSettled?: (job: unknown) => void }) => {
    settleJob = opts.onJobSettled;
    return { startJob, jobs: [], jobsById: {} };
  },
}));

const speak = jest.fn();
const toggleRecording = jest.fn();
jest.mock("@/hooks/agents/useAgentSpeech", () => ({
  useAgentSpeech: () => ({
    isRecording: false,
    isSpeaking: false,
    error: null,
    speak,
    stopSpeaking: jest.fn(),
    resetSpokenGuard: jest.fn(),
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    toggleRecording,
    isSupported: true,
  }),
}));

const exportTranscriptPdfs = jest.fn();
const downloadBlob = jest.fn();
jest.mock("@/lib/exportTranscript", () => ({
  exportTranscriptPdfs: (...args: unknown[]) => exportTranscriptPdfs(...args),
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  startJob.mockResolvedValue({ job_id: "j1", session_id: "s1", status: "queued" });
  exportTranscriptPdfs.mockResolvedValue([
    { fileName: "support_conversation_log.pdf", blob: new Blob(["x"]) },
    { fileName: "support_conversation_report.pdf", blob: new Blob(["y"]) },
  ]);
});

function renderOpen(onClose = jest.fn()) {
  return render(<SupportAgentPopup open onClose={onClose} />);
}

describe("SupportAgentPopup", () => {
  it("renders nothing when closed", () => {
    render(<SupportAgentPopup open={false} onClose={jest.fn()} />);
    expect(screen.queryByTestId("support-agent-popup")).not.toBeInTheDocument();
  });

  it("renders the assistant dialog when open", () => {
    renderOpen();
    expect(screen.getByTestId("support-agent-popup")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /message/i })).toBeInTheDocument();
  });

  it("routes a typed message through the Meridian async-jobs path", async () => {
    renderOpen();
    const input = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(input, { target: { value: "How do I reset my password?" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(startJob).toHaveBeenCalledTimes(1));
    expect(startJob).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "How do I reset my password?",
        context: expect.objectContaining({ surface: "support_popup" }),
      }),
    );
  });

  it("sends on Enter and keeps Shift+Enter as a newline", async () => {
    renderOpen();
    const input = screen.getByRole("textbox", { name: /message/i });

    fireEvent.change(input, { target: { value: "first" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(startJob).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(startJob).toHaveBeenCalledTimes(1));
  });

  it("does not send an empty or whitespace-only message", () => {
    renderOpen();
    const input = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(startJob).not.toHaveBeenCalled();
  });

  it("renders the assistant answer once the job settles", async () => {
    renderOpen();
    const input = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(startJob).toHaveBeenCalled());

    act(() => {
      settleJob?.({ status: "complete", content: "Here is how to do that.", metadata: {} });
    });

    expect(await screen.findByText("Here is how to do that.")).toBeInTheDocument();
  });

  it("exports the dual-PDF transcript using the shared Meridian exporter", async () => {
    renderOpen();
    const input = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(startJob).toHaveBeenCalled());
    act(() => {
      settleJob?.({ status: "complete", content: "An answer.", metadata: {} });
    });
    await screen.findByText("An answer.");

    fireEvent.click(screen.getByRole("button", { name: /export this conversation/i }));

    await waitFor(() => expect(exportTranscriptPdfs).toHaveBeenCalledTimes(1));
    // Both documents are handed to the browser, not just the log.
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(2));
  });

  it("refuses to export a conversation with no real turns", async () => {
    const { toast } = jest.requireMock("sonner") as { toast: { error: jest.Mock } };
    renderOpen();
    fireEvent.click(screen.getByRole("button", { name: /export this conversation/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(exportTranscriptPdfs).not.toHaveBeenCalled();
  });

  it("closes via the close button and on Escape", () => {
    const onClose = jest.fn();
    renderOpen(onClose);
    fireEvent.click(screen.getByRole("button", { name: /close support assistant/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("exposes a microphone control wired to speech input", () => {
    renderOpen();
    fireEvent.click(screen.getByRole("button", { name: /dictate a message/i }));
    expect(toggleRecording).toHaveBeenCalledTimes(1);
  });

  it("speaks the answer only when voice replies are enabled", async () => {
    renderOpen();
    const input = screen.getByRole("textbox", { name: /message/i });
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(startJob).toHaveBeenCalled());

    // Voice defaults OFF — a help popup must not start talking unprompted.
    act(() => {
      settleJob?.({ status: "complete", content: "Quiet answer.", metadata: {} });
    });
    await screen.findByText("Quiet answer.");
    expect(speak).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /turn voice replies on/i }));
    fireEvent.change(input, { target: { value: "again" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(startJob).toHaveBeenCalledTimes(2));
    act(() => {
      settleJob?.({ status: "complete", content: "Spoken answer.", metadata: {} });
    });
    await waitFor(() => expect(speak).toHaveBeenCalledWith("Spoken answer."));
  });
});
