import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  needsMoveConfirmation,
  useChangeUserOrg,
  useOrgDirectory,
} from "../useOrgAssignment";
import {
  assignUserToOrg,
  getOrgDirectory,
  removeUserFromOrg,
} from "@/services/super-admin/user-management/org-assignment.service";
import { toast } from "sonner";

jest.mock(
  "@/services/super-admin/user-management/org-assignment.service",
  () => ({
    getOrgDirectory: jest.fn(),
    assignUserToOrg: jest.fn(),
    removeUserFromOrg: jest.fn(),
  }),
);
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("needsMoveConfirmation", () => {
  it.each([
    [null, "o1", false, "first assignment"],
    ["o1", "o2", true, "move between orgs"],
    ["o1", null, true, "clear"],
    ["o1", "o1", false, "no change"],
    [undefined, "o1", true, "unknown current org is treated as 'in one'"],
  ] as Array<[string | null | undefined, string | null, boolean, string]>)(
    "%s -> %s = %s (%s)",
    (from, to, expected) => {
      expect(needsMoveConfirmation(from, to)).toBe(expected);
    },
  );
});

describe("useOrgDirectory", () => {
  afterEach(() => jest.clearAllMocks());

  it("never fetches when disabled (a non-super-admin)", async () => {
    renderHook(() => useOrgDirectory(false), { wrapper: wrapper() });
    await new Promise((r) => setTimeout(r, 0));
    expect(getOrgDirectory).not.toHaveBeenCalled();
  });

  it("fetches when enabled", async () => {
    (getOrgDirectory as jest.Mock).mockResolvedValueOnce([
      { id: "o1", name: "One" },
    ]);
    const { result } = renderHook(() => useOrgDirectory(true), {
      wrapper: wrapper(),
    });
    await waitFor(() =>
      expect(result.current.data).toEqual([{ id: "o1", name: "One" }]),
    );
  });
});

describe("useChangeUserOrg", () => {
  afterEach(() => jest.clearAllMocks());

  it("assigns when a target org is chosen", async () => {
    (assignUserToOrg as jest.Mock).mockResolvedValueOnce({});
    const { result } = renderHook(() => useChangeUserOrg(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({
        userId: "u1",
        fromOrgId: "o1",
        toOrgId: "o2",
      });
    });
    expect(assignUserToOrg).toHaveBeenCalledWith("o2", "u1");
    expect(removeUserFromOrg).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Organisation updated");
  });

  it("clears from the current org when the target is none", async () => {
    (removeUserFromOrg as jest.Mock).mockResolvedValueOnce({});
    const { result } = renderHook(() => useChangeUserOrg(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current.mutateAsync({
        userId: "u1",
        fromOrgId: "o1",
        toOrgId: null,
      });
    });
    expect(removeUserFromOrg).toHaveBeenCalledWith("o1", "u1");
  });

  it("never reports success when there is nothing to write", async () => {
    const { result } = renderHook(() => useChangeUserOrg(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current
        .mutateAsync({ userId: "u1", fromOrgId: null, toOrgId: null })
        .catch(() => undefined);
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("surfaces the server's refusal (e.g. ORG-F1's 403 detail)", async () => {
    (assignUserToOrg as jest.Mock).mockRejectedValueOnce({
      response: {
        data: { detail: "user already belongs to another organisation" },
      },
      message: "Request failed",
    });
    const { result } = renderHook(() => useChangeUserOrg(), {
      wrapper: wrapper(),
    });
    await act(async () => {
      await result.current
        .mutateAsync({ userId: "u1", fromOrgId: "o1", toOrgId: "o2" })
        .catch(() => undefined);
    });
    expect(toast.error).toHaveBeenCalledWith(
      "user already belongs to another organisation",
    );
  });
});
