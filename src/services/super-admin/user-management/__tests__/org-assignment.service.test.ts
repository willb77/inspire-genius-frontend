import {
  assignUserToOrg,
  getOrgDirectory,
  removeUserFromOrg,
} from "../org-assignment.service";
import { api } from "@/lib/axios";

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

describe("org-assignment service", () => {
  afterEach(() => jest.clearAllMocks());

  it("lists organisations from org-service's platform-only directory route", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { data: [{ id: "o1", name: "Org One" }] },
    });
    await expect(getOrgDirectory()).resolves.toEqual([{ id: "o1", name: "Org One" }]);
    expect(api.get).toHaveBeenCalledWith("/v1/orgs/directory");
  });

  it("reads an empty directory as an empty list, not undefined", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { data: null } });
    await expect(getOrgDirectory()).resolves.toEqual([]);
  });

  it("assigns through org-service's member route", async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({ data: { data: { user_id: "u1", org_id: "o1" } } });
    await assignUserToOrg("o1", "u1");
    expect(api.post).toHaveBeenCalledWith("/v1/orgs/o1/members", { user_id: "u1" });
  });

  it("clears through the current org's member route", async () => {
    (api.delete as jest.Mock).mockResolvedValueOnce({ data: { status: true } });
    await removeUserFromOrg("o1", "u1");
    expect(api.delete).toHaveBeenCalledWith("/v1/orgs/o1/members/u1");
  });
});
