/**
 * @jest-environment jsdom
 */
import { agentApi } from "@/lib/agentApi";
import {
  getUserEntitlements,
  grantVertical,
  revokeVertical,
} from "../verticalEntitlementsAdmin.service";

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn(), post: jest.fn() },
}));

const api = agentApi as jest.Mocked<typeof agentApi>;
const ok = (data: unknown) => ({ data }) as never;

describe("verticalEntitlementsAdmin.service — the engine, under /v1/agents/", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads one person's entitlements, encoding the id", async () => {
    api.get.mockResolvedValueOnce(ok({ user_id: "a/b" }));
    await expect(getUserEntitlements("a/b")).resolves.toEqual({ user_id: "a/b" });
    expect(api.get).toHaveBeenCalledWith("/v1/agents/admin/entitlements/users/a%2Fb");
  });

  it("grants exactly one vertical, sending only its key", async () => {
    api.post.mockResolvedValueOnce(ok({ changed: true }));
    await grantVertical("u1", "lumen");
    expect(api.post).toHaveBeenCalledWith("/v1/agents/admin/entitlements/users/u1/grant", {
      vertical: "lumen",
    });
  });

  it("revokes exactly one vertical, sending only its key", async () => {
    api.post.mockResolvedValueOnce(ok({ changed: true }));
    await revokeVertical("u1", "grant");
    expect(api.post).toHaveBeenCalledWith("/v1/agents/admin/entitlements/users/u1/revoke", {
      vertical: "grant",
    });
  });
});
