/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import PersonalDataSettings from "@/components/shared/settings/PersonalDataSettings";
import { createFact, getMyProfile } from "@/services/profile/profile";

jest.mock("@/services/profile/profile", () => ({
  getMyProfile: jest.fn(),
  createFact: jest.fn(),
}));

jest.mock("@/hooks/documents/useDocumentUpload", () => ({
  useDocumentUpload: () => ({
    mutateAsync: jest.fn().mockResolvedValue({ id: "doc-1" }),
    isPending: false,
  }),
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
      <PersonalDataSettings />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (getMyProfile as jest.Mock).mockResolvedValue({
    user_id: "u-1",
    facts: [],
    loaded_frameworks: [],
  });
});

test("Save calls useCreateFact with the row's category, key, value, source", async () => {
  (createFact as jest.Mock).mockResolvedValueOnce({
    id: "f-1",
    category: "career",
    key: "current_role",
    value: "Senior PM",
    source: "user_input",
  });

  renderWithClient();

  // Wait for the snapshot query to finish (input becomes enabled).
  const roleInput = (await screen.findByLabelText(
    /current role/i,
  )) as HTMLInputElement;
  await waitFor(() => expect(roleInput).toBeEnabled());

  fireEvent.change(roleInput, { target: { value: "Senior PM" } });

  // Each row has its own Save button — click the one tied to "current_role".
  // The row wraps input + footer in a <div>; the Save button is in the
  // footer's grandparent. Walk up until we find a button sibling.
  let node: HTMLElement | null = roleInput;
  let buttonForRole: HTMLButtonElement | null = null;
  while (node && !buttonForRole) {
    node = node.parentElement;
    buttonForRole = node?.querySelector("button") as HTMLButtonElement | null;
  }
  expect(buttonForRole).toBeTruthy();
  fireEvent.click(buttonForRole as HTMLButtonElement);

  await waitFor(() => {
    expect(createFact).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "career",
        key: "current_role",
        value: "Senior PM",
        source: "user_input",
      }),
    );
  });

  // Sanity: we didn't fire one Save per row.
  expect(createFact).toHaveBeenCalledTimes(1);
  // sanity that multiple Save buttons exist (one per row)
  expect(
    screen.getAllByRole("button", { name: /save/i }).length,
  ).toBeGreaterThan(1);
});
