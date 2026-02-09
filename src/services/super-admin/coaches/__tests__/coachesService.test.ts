import {
  getUserAgentAssignments,
  assignAgentsToUser,
  type AssignAgentsPayload,
} from "../coachesService";
import { api } from "@/lib/axios";

/* -------------------------------------------------
 MOCK AXIOS INSTANCE
------------------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe("userAgentAssignments.service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /* --------------------------------
     getUserAgentAssignments
  --------------------------------- */
  it("fetches agent assignments for a user", async () => {
    const mockResponse = {
      status: true,
      message: "Success",
      data: {
        agents: [
          {
            id: "agent-1",
            name: "Agent One",
            is_assigned_to_user: true,
          },
        ],
      },
    };

    (api.get as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await getUserAgentAssignments("user-123");

    expect(api.get).toHaveBeenCalledWith(
      "/v1/agents-settings/user/user-123/agents"
    );

    expect(result).toEqual(mockResponse);
  });

  it("encodes userId before calling API", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { status: true },
    });

    await getUserAgentAssignments("user id with space");

    expect(api.get).toHaveBeenCalledWith(
      "/v1/agents-settings/user/user%20id%20with%20space/agents"
    );
  });

  /* --------------------------------
     assignAgentsToUser
  --------------------------------- */
  it("assigns agents to a user", async () => {
    const payload: AssignAgentsPayload = {
      user_id: "user-123",
      agent_ids: ["agent-1", "agent-2"],
      is_active: true,
    };

    const mockResponse = {
      status: true,
      message: "Agents assigned successfully",
    };

    (api.post as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const result = await assignAgentsToUser(payload);

    expect(api.post).toHaveBeenCalledWith(
      "/v1/agents-settings/user/agents/assign",
      payload
    );

    expect(result).toEqual(mockResponse);
  });
});
