/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AssessmentsSettings from "@/components/shared/settings/AssessmentsSettings";
import { createAssessment } from "@/services/profile/profile";

jest.mock("@/services/profile/profile", () => ({
  createAssessment: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function renderWithClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <AssessmentsSettings />
    </QueryClientProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

test("opens DISC dialog and submits → useCreateAssessment called with DISC payload", async () => {
  (createAssessment as jest.Mock).mockResolvedValueOnce({
    id: "a-1",
    framework: "DISC",
    assessed_at: new Date().toISOString(),
  });

  renderWithClient();

  fireEvent.click(screen.getByRole("button", { name: /add disc result/i }));

  // Dialog appears (data-testid="disc-dialog").
  const dialog = await screen.findByTestId("disc-dialog");
  expect(dialog).toBeInTheDocument();

  // Fill the four DISC scores.
  fireEvent.change(screen.getByLabelText(/^D \(0–100\)/i), {
    target: { value: "70" },
  });
  fireEvent.change(screen.getByLabelText(/^I \(0–100\)/i), {
    target: { value: "50" },
  });
  fireEvent.change(screen.getByLabelText(/^S \(0–100\)/i), {
    target: { value: "40" },
  });
  fireEvent.change(screen.getByLabelText(/^C \(0–100\)/i), {
    target: { value: "30" },
  });

  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

  await waitFor(() => {
    expect(createAssessment).toHaveBeenCalledTimes(1);
  });
  const payload = (createAssessment as jest.Mock).mock.calls[0][0];
  expect(payload).toMatchObject({
    framework: "DISC",
    source: "user_input",
    raw_payload: { D: 70, I: 50, S: 40, C: 30 },
  });
  expect(payload.parsed_scores).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ dimension: "D", score: 70 }),
      expect.objectContaining({ dimension: "I", score: 50 }),
      expect.objectContaining({ dimension: "S", score: 40 }),
      expect.objectContaining({ dimension: "C", score: 30 }),
    ]),
  );
});
