import {
  listAgents,
  createCoach,
  updateCoach,
  deactivateCoach,
  deleteCoach,
  getCoachCategories,
} from "../coachManagementService";

/* -------------------------------------------------
 MOCK: agentApi's getApi() returns a mock axios instance
------------------------------------------------- */
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

jest.mock("@/lib/agentApi", () => ({
  getApi: () => mockAxios,
}));

describe("agents.service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /* --------------------------------
     listAgents
  --------------------------------- */
  it("fetches agents list with default params", async () => {
    const mockResponse = {
      message: "Success",
      status: true,
      data: {
        agents: [],
        pagination: { total: 0, page: 1, page_size: 10 },
      },
    };

    mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

    const result = await listAgents();

    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      {
        params: {
          page: 1,
          page_size: 10,
          search: undefined,
          status: undefined,
          type: undefined,
        },
      }
    );

    expect(result).toEqual(mockResponse);
  });

  it("fetches agents list with custom params", async () => {
    mockAxios.get.mockResolvedValueOnce({ data: { status: true } });

    await listAgents({
      page: 2,
      limit: 5,
      search: "test",
      status: "active",
      type: "ai",
    });

    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      {
        params: {
          page: 2,
          page_size: 5,
          search: "test",
          status: "active",
          type: "ai",
        },
      }
    );
  });

  /* --------------------------------
     createCoach
  --------------------------------- */
  it("creates a coach", async () => {
    const body = {
      name: "Coach 1",
      prompt: "Test prompt",
      category_id: "cat-1",
    };

    const mockResponse = { status: true, message: "Created" };

    mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await createCoach(body);

    expect(mockAxios.post).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      body
    );

    expect(result).toEqual(mockResponse);
  });

  /* --------------------------------
     updateCoach
  --------------------------------- */
  it("updates a coach", async () => {
    const body = {
      agent_id: "agent-1",
      prompt: "Updated prompt",
      status: "active",
    };

    const mockResponse = { status: true, message: "Updated" };

    mockAxios.put.mockResolvedValueOnce({ data: mockResponse });

    const result = await updateCoach(body);

    expect(mockAxios.put).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      {
        prompt: "Updated prompt",
        status: "active",
      },
      {
        params: { agent_id: "agent-1" },
      }
    );

    expect(result).toEqual(mockResponse);
  });

  /* --------------------------------
     deactivateCoach
  --------------------------------- */
  it("deactivates a coach via PUT with status deactivated", async () => {
    const mockResponse = { status: true, message: "Deactivated" };

    mockAxios.put.mockResolvedValueOnce({ data: mockResponse });

    const result = await deactivateCoach("agent-1");

    expect(mockAxios.put).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      { status: "deactivated" },
      { params: { agent_id: "agent-1" } }
    );

    expect(result).toEqual(mockResponse);
  });

  it("hard deletes a coach via DELETE", async () => {
    const mockResponse = { status: true, message: "Deleted" };

    mockAxios.delete.mockResolvedValueOnce({ data: mockResponse });

    const result = await deleteCoach("agent-1");

    expect(mockAxios.delete).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      { params: { agent_id: "agent-1" } }
    );

    expect(result).toEqual(mockResponse);
  });

  /* --------------------------------
     getCoachCategories
  --------------------------------- */
  it("fetches coach categories", async () => {
    const mockResponse = {
      status: true,
      data: {
        Tones: [
          {
            id: "1",
            name: "tone-1",
            display_name: "Tone 1",
            type: "voice",
            created_at: "2024-01-01",
          },
        ],
      },
    };

    mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

    const result = await getCoachCategories();

    expect(mockAxios.get).toHaveBeenCalledWith(
      "/v1/agents-settings/category"
    );

    expect(result).toEqual(mockResponse);
  });
});
