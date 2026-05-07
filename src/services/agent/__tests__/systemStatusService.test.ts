import { getSystemStatus } from "../systemStatusService";
import { agentApi } from "@/lib/agentApi";

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn() },
}));

describe("systemStatusService.getSystemStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls /v1/agents/system-status and returns parsed body", async () => {
    const fixture = {
      service: "agent-engine",
      version: "1.1.0",
      ecosystem_enabled: true,
      active_connections: 3,
    };
    (agentApi.get as jest.Mock).mockResolvedValue({ data: fixture });

    const result = await getSystemStatus();

    expect(agentApi.get).toHaveBeenCalledWith("/v1/agents/system-status");
    expect(result).toEqual(fixture);
  });

  it("propagates network errors", async () => {
    const err = new Error("ECONNREFUSED");
    (agentApi.get as jest.Mock).mockRejectedValue(err);

    await expect(getSystemStatus()).rejects.toThrow("ECONNREFUSED");
  });
});
