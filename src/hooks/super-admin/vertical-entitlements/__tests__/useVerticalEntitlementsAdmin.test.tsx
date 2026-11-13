import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  useGrantVertical,
  useRevokeVertical,
  useUserEntitlements,
  useVerticalEntitlementsPermission,
} from "@/hooks/super-admin/vertical-entitlements/useVerticalEntitlementsAdmin";
import { useMyApproverStatus } from "@/hooks/super-admin/prism-access/usePrismAccessAdmin";
import * as svc from "@/services/super-admin/vertical-entitlements/verticalEntitlementsAdmin.service";
import * as approverSvc from "@/services/super-admin/prism-access/prismAccessAdmin.service";

jest.mock("@/services/super-admin/vertical-entitlements/verticalEntitlementsAdmin.service", () => ({
  getUserEntitlements: jest.fn(),
  grantVertical: jest.fn(),
  revokeVertical: jest.fn(),
}));
jest.mock("@/services/super-admin/prism-access/prismAccessAdmin.service", () => ({
  getMyApproverStatus: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const m = svc as jest.Mocked<typeof svc>;
const a = approverSvc as jest.Mocked<typeof approverSvc>;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const view = { user_id: "u1", effective: ["lumen"] } as never;

describe("useVerticalEntitlementsAdmin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("permission is true only when the backend lists the vertical_entitlements capability", async () => {
    a.getMyApproverStatus.mockResolvedValueOnce({
      is_owner: false, capabilities: ["prism_survey_access"], known_capabilities: [],
    });
    // Wait for the status to LOAD before asserting: false-while-loading would
    // pass whatever the capability check said.
    const prismOnly = renderHook(
      () => ({ perm: useVerticalEntitlementsPermission(true), status: useMyApproverStatus(true) }),
      { wrapper },
    );
    await waitFor(() => expect(prismOnly.result.current.status.isSuccess).toBe(true));
    expect(prismOnly.result.current.perm.canManageEntitlements).toBe(false);

    a.getMyApproverStatus.mockResolvedValueOnce({
      is_owner: false, capabilities: ["vertical_entitlements"], known_capabilities: [],
    });
    const approver = renderHook(() => useVerticalEntitlementsPermission(true), { wrapper });
    await waitFor(() => expect(approver.result.current.canManageEntitlements).toBe(true));
  });

  it("does not ask the backend unless enabled", () => {
    renderHook(() => useVerticalEntitlementsPermission(false), { wrapper });
    expect(a.getMyApproverStatus).not.toHaveBeenCalled();
  });

  it("reads a person only when there is an id", async () => {
    m.getUserEntitlements.mockResolvedValueOnce(view);
    renderHook(() => useUserEntitlements(null), { wrapper });
    expect(m.getUserEntitlements).not.toHaveBeenCalled();
    const { result } = renderHook(() => useUserEntitlements("u1"), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(view));
  });

  it("grant sends one key and toasts the title", async () => {
    m.grantVertical.mockResolvedValueOnce({ changed: true, vertical: "lumen", rows_changed: 2, view });
    const { result } = renderHook(() => useGrantVertical(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ userId: "u1", vertical: "lumen", title: "Lumen" });
    });
    expect(m.grantVertical).toHaveBeenCalledWith("u1", "lumen");
    expect(toast.success).toHaveBeenCalledWith("Lumen granted.");
  });

  it("revoke sends one key; a failure shows the server's message", async () => {
    m.revokeVertical.mockRejectedValueOnce({
      response: { data: { detail: { message: "That vertical cannot be granted or revoked here." } } },
    });
    const { result } = renderHook(() => useRevokeVertical(), { wrapper });
    await act(async () => {
      await result.current
        .mutateAsync({ userId: "u1", vertical: "grant", title: "GRANT" })
        .catch(() => undefined);
    });
    expect(m.revokeVertical).toHaveBeenCalledWith("u1", "grant");
    expect(toast.error).toHaveBeenCalledWith("That vertical cannot be granted or revoked here.");
  });
});
