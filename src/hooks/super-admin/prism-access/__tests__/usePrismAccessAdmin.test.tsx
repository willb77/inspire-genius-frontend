import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  prismAccessErrorMessage,
  useAddApprover,
  useApprovers,
  useGrantUserPrismAccess,
  useOrgPrismAccess,
  usePrismAccessPermissions,
  useRemoveApprover,
  useRevokeUserPrismAccess,
  useSetOrgPrismAccess,
  useUserPrismAccess,
} from "@/hooks/super-admin/prism-access/usePrismAccessAdmin";
import * as svc from "@/services/super-admin/prism-access/prismAccessAdmin.service";

jest.mock("@/services/super-admin/prism-access/prismAccessAdmin.service", () => ({
  getMyApproverStatus: jest.fn(),
  getUserPrismAccess: jest.fn(),
  grantUserPrismAccess: jest.fn(),
  revokeUserPrismAccess: jest.fn(),
  getOrgPrismAccess: jest.fn(),
  setOrgPrismAccess: jest.fn(),
  listApprovers: jest.fn(),
  addApprover: jest.fn(),
  removeApprover: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const m = svc as jest.Mocked<typeof svc>;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const view = { user: { user_id: "u1" }, coverage: { allowed: true } } as never;

describe("usePrismAccessAdmin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("is an approver only when the server lists the capability", async () => {
    m.getMyApproverStatus.mockResolvedValueOnce({
      is_owner: false,
      capabilities: ["prism_survey_access"],
      known_capabilities: ["prism_survey_access"],
    });
    const { result } = renderHook(() => usePrismAccessPermissions(true), { wrapper });
    expect(result.current).toEqual({ canManagePrismAccess: false, isOwner: false });
    await waitFor(() => expect(result.current.canManagePrismAccess).toBe(true));
    expect(result.current.isOwner).toBe(false);
  });

  it("an approver for another control is not a PRISM approver; the owner flag is the server's", async () => {
    m.getMyApproverStatus.mockResolvedValueOnce({
      is_owner: true,
      capabilities: ["vertical_entitlements"],
      known_capabilities: ["prism_survey_access", "vertical_entitlements"],
    });
    const { result } = renderHook(() => usePrismAccessPermissions(true), { wrapper });
    await waitFor(() => expect(result.current.isOwner).toBe(true));
    expect(result.current.canManagePrismAccess).toBe(false);
  });

  it("reads a refusal as no controls, and does not ask when disabled", async () => {
    m.getMyApproverStatus.mockRejectedValueOnce(new Error("403"));
    const { result } = renderHook(() => usePrismAccessPermissions(true), { wrapper });
    await waitFor(() => expect(m.getMyApproverStatus).toHaveBeenCalled());
    expect(result.current).toEqual({ canManagePrismAccess: false, isOwner: false });
    renderHook(() => usePrismAccessPermissions(false), { wrapper });
    expect(m.getMyApproverStatus).toHaveBeenCalledTimes(1);
  });

  it("reads a user and an org only with an id", async () => {
    m.getUserPrismAccess.mockResolvedValueOnce(view);
    m.getOrgPrismAccess.mockResolvedValueOnce({ listed: true } as never);
    const u = renderHook(() => useUserPrismAccess("u1"), { wrapper });
    const o = renderHook(() => useOrgPrismAccess("o1"), { wrapper });
    renderHook(() => useUserPrismAccess(null), { wrapper });
    await waitFor(() => expect(u.result.current.data).toBe(view));
    await waitFor(() => expect(o.result.current.data).toEqual({ listed: true }));
    expect(m.getUserPrismAccess).toHaveBeenCalledTimes(1);
  });

  it("grant and revoke toast the outcome", async () => {
    m.grantUserPrismAccess.mockResolvedValueOnce({ changed: true, mode: "x", view });
    m.revokeUserPrismAccess.mockResolvedValueOnce({ changed: false, mode: "x", view });
    const g = renderHook(() => useGrantUserPrismAccess(), { wrapper });
    const r = renderHook(() => useRevokeUserPrismAccess(), { wrapper });
    await act(() => g.result.current.mutateAsync({ userId: "u1" }));
    await act(() => r.result.current.mutateAsync({ userId: "u1" }));
    expect(toast.success).toHaveBeenCalledWith("PRISM survey access granted.");
    expect(toast.success).toHaveBeenCalledWith("There was no approval to revoke.");
  });

  it("a refused change shows the server's message", async () => {
    m.grantUserPrismAccess.mockRejectedValueOnce({
      response: { data: { detail: { code: "not_an_approver", message: "Ask the owner." } } },
    });
    const g = renderHook(() => useGrantUserPrismAccess(), { wrapper });
    await act(async () => {
      await g.result.current.mutateAsync({ userId: "u1" }).catch(() => undefined);
    });
    expect(toast.error).toHaveBeenCalledWith("Ask the owner.");
  });

  it("org switch and approver changes call the service", async () => {
    m.setOrgPrismAccess.mockResolvedValueOnce({ changed: true, listed: true, view: {} as never });
    m.addApprover.mockResolvedValueOnce({} as never);
    m.removeApprover.mockResolvedValueOnce({ id: "a", removed: true });
    m.listApprovers.mockResolvedValueOnce({ approvers: [], known_capabilities: [] });
    const s = renderHook(() => useSetOrgPrismAccess(), { wrapper });
    const a = renderHook(() => useAddApprover(), { wrapper });
    const d = renderHook(() => useRemoveApprover(), { wrapper });
    const l = renderHook(() => useApprovers(true), { wrapper });
    await act(() => s.result.current.mutateAsync({ orgId: "o1", listed: true }));
    await act(() => a.result.current.mutateAsync({ capability: "c", email: "e@example.com" }));
    await act(() => d.result.current.mutateAsync({ id: "a" }));
    await waitFor(() => expect(l.result.current.isSuccess).toBe(true));
    expect(m.setOrgPrismAccess).toHaveBeenCalledWith("o1", true);
    expect(m.removeApprover).toHaveBeenCalledWith("a");
  });

  it("prismAccessErrorMessage prefers the server's words, then a fallback", () => {
    expect(prismAccessErrorMessage({ response: { data: { detail: "plain" } } }, "f")).toBe("plain");
    expect(prismAccessErrorMessage({ response: { data: { message: "m" } } }, "f")).toBe("m");
    expect(prismAccessErrorMessage(new Error("x"), "f")).toBe("f");
  });
});
