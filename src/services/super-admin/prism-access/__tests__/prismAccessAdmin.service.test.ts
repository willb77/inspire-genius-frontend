/**
 * @jest-environment jsdom
 */
import { agentApi } from "@/lib/agentApi";
import {
  addApprover,
  getMyApproverStatus,
  getOrgPrismAccess,
  getUserPrismAccess,
  grantUserPrismAccess,
  listApprovers,
  removeApprover,
  revokeUserPrismAccess,
  setOrgPrismAccess,
} from "../prismAccessAdmin.service";

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = agentApi as jest.Mocked<typeof agentApi>;
const ok = (data: unknown) => ({ data }) as never;

describe("prismAccessAdmin.service — every call goes to the engine under /v1/agents/", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads my approver status", async () => {
    api.get.mockResolvedValueOnce(ok({ is_owner: false, capabilities: [] }));
    await expect(getMyApproverStatus()).resolves.toEqual({ is_owner: false, capabilities: [] });
    expect(api.get).toHaveBeenCalledWith("/v1/agents/admin/approvers/me");
  });

  it("reads, grants and revokes a user's access by id (encoded)", async () => {
    api.get.mockResolvedValue(ok({}));
    api.post.mockResolvedValue(ok({ changed: true }));
    await getUserPrismAccess("u 1");
    await grantUserPrismAccess("u1");
    await revokeUserPrismAccess("u1");
    expect(api.get).toHaveBeenCalledWith("/v1/agents/prism/admin/access/users/u%201");
    expect(api.post).toHaveBeenNthCalledWith(1, "/v1/agents/prism/admin/access/users/u1/grant");
    expect(api.post).toHaveBeenNthCalledWith(2, "/v1/agents/prism/admin/access/users/u1/revoke");
  });

  it("lists an org with PUT and unlists it with DELETE, sending no switch name", async () => {
    api.get.mockResolvedValue(ok({ listed: false }));
    api.put.mockResolvedValue(ok({ listed: true }));
    api.delete.mockResolvedValue(ok({ listed: false }));
    await getOrgPrismAccess("o1");
    await setOrgPrismAccess("o1", true);
    await setOrgPrismAccess("o1", false);
    expect(api.get).toHaveBeenCalledWith("/v1/agents/prism/admin/access/orgs/o1");
    expect(api.put).toHaveBeenCalledWith("/v1/agents/prism/admin/access/orgs/o1");
    expect(api.delete).toHaveBeenCalledWith("/v1/agents/prism/admin/access/orgs/o1");
  });

  it("lists, adds and removes approvers", async () => {
    api.get.mockResolvedValue(ok({ approvers: [] }));
    api.post.mockResolvedValue(ok({ id: "a1" }));
    api.delete.mockResolvedValue(ok({ id: "a1", removed: true }));
    await listApprovers();
    await addApprover({ capability: "prism_survey_access", email: "x@example.com" });
    await removeApprover("a1");
    expect(api.get).toHaveBeenCalledWith("/v1/agents/admin/approvers");
    expect(api.post).toHaveBeenCalledWith("/v1/agents/admin/approvers", {
      capability: "prism_survey_access",
      email: "x@example.com",
    });
    expect(api.delete).toHaveBeenCalledWith("/v1/agents/admin/approvers/a1");
  });
});
