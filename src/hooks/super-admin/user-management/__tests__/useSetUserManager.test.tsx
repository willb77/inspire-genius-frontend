jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { email: "admin@example.test" } }) }));
jest.mock("@/services/audit/audit.service", () => ({ logAuditEvent: jest.fn() }));

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { setUserManager } from "@/services/super-admin/user-management/user-management.service";
import { useSetUserManager } from "../useUserManagement";

const mockedApi = api as jest.Mocked<typeof api>;

function wrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { Wrapper, invalidate };
}

beforeEach(() => jest.clearAllMocks());

describe("setUserManager", () => {
  it("PUTs the manager id, and null to clear", async () => {
    mockedApi.put.mockResolvedValue({ data: { status: true, data: {} } });
    await setUserManager("u 1", "m1");
    expect(mockedApi.put).toHaveBeenCalledWith("/v1/user-management/users/u%201/manager", {
      manager_user_id: "m1",
    });
    await setUserManager("u1", null);
    expect(mockedApi.put).toHaveBeenLastCalledWith("/v1/user-management/users/u1/manager", {
      manager_user_id: null,
    });
  });
});

describe("useSetUserManager", () => {
  it("names the new manager and refreshes the user lists", async () => {
    mockedApi.put.mockResolvedValue({
      data: { status: true, data: { manager_user_id: "m1", manager_name: "Boss Person" } },
    });
    const { Wrapper, invalidate } = wrapper();
    const { result } = renderHook(() => useSetUserManager(), { wrapper: Wrapper });
    act(() => result.current.mutate({ user_id: "u1", manager_user_id: "m1" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith("Manager set to Boss Person");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["super-admin", "user-management"], exact: false });
  });

  it("says when a manager was cleared", async () => {
    mockedApi.put.mockResolvedValue({ data: { status: true, data: { manager_user_id: null } } });
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useSetUserManager(), { wrapper: Wrapper });
    act(() => result.current.mutate({ user_id: "u1", manager_user_id: null }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith("Manager cleared");
  });

  it("shows the server's refusal in its own words", async () => {
    mockedApi.put.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 409"), {
        response: { status: 409, data: { message: "The manager is in a different organization." } },
      })
    );
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useSetUserManager(), { wrapper: Wrapper });
    act(() => result.current.mutate({ user_id: "u1", manager_user_id: "m9" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith("The manager is in a different organization.");
  });
});
