/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import RetentionSettings from "@/components/settings/RetentionSettings";

// ─── Stub the retention hook so we don't fire real Axios ──────────
jest.mock("@/hooks/retention/useRetention", () => ({
  useRetentionPolicies: () => ({
    data: [
      {
        id: "p1",
        scope: "system",
        scope_id: null,
        memory_tier: "short_term",
        retention_days: 90,
        archive_to_s3: true,
        set_by_user_id: null,
        created_at: null,
        updated_at: null,
      },
    ],
    isPending: false,
  }),
  useUpsertRetentionPolicy: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteRetentionPolicy: () => ({ mutate: jest.fn(), isPending: false }),
}));

// ─── Stub auth context — return whatever role we set ──────────────
let currentRole = "super-admin";
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { role: currentRole } }),
}));

// ─── shadcn/ui primitives need minimal mocks for jsdom ────────────
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span />,
}));

jest.mock("@/components/ui/switch", () => ({
  Switch: ({ checked }: { checked: boolean }) => (
    <input type="checkbox" defaultChecked={checked} />
  ),
}));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

function renderWithQuery(node: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe("RetentionSettings", () => {
  test("super-admin sees the header and the active policy", () => {
    currentRole = "super-admin";
    renderWithQuery(<RetentionSettings />);
    expect(screen.getByText(/Memory Retention/i)).toBeInTheDocument();
    expect(screen.getByText(/short_term/)).toBeInTheDocument();
    expect(screen.getByText(/90d/)).toBeInTheDocument();
  });

  test("manager sees the card (can write user-scope policies)", () => {
    currentRole = "manager";
    renderWithQuery(<RetentionSettings />);
    expect(screen.getByText(/Memory Retention/i)).toBeInTheDocument();
  });

  test("distributor sees nothing (no permitted scopes)", () => {
    currentRole = "distributor";
    const { container } = renderWithQuery(<RetentionSettings />);
    expect(container).toBeEmptyDOMElement();
  });
});
