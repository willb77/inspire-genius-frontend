import {
  getUsers,
  inviteUser,
  updateUserByEmail,
  deleteUserByEmail,
  resendInvitation,
  purgeInactiveUsers,
  changeUserRole,
  type InviteUserPayload,
  type UpdateUserPayload,
  type ChangeUserRolePayload,
} from "../user-management.service";

import { api } from "@/lib/axios";

/* -----------------------------------------
   MOCK AXIOS INSTANCE
----------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("Super Admin User Management Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -----------------------------------------
     getUsers
  ----------------------------------------- */
  it("should fetch users with params", async () => {
    const mockResponse = {
      message: "Users fetched",
      data: {
        users: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          has_more: false,
        },
        filters_applied: {},
      },
    };

    (api.get as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const params = { page: 1, limit: 10 };

    const result = await getUsers(params);

    expect(api.get).toHaveBeenCalledWith(
      "/v1/user-management/users",
      { params }
    );
    expect(result).toEqual(mockResponse);
  });

  /* -----------------------------------------
     inviteUser
  ----------------------------------------- */
  it("should invite a user", async () => {
    const payload: InviteUserPayload = {
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
    };

    const mockResponse = {
      message: "Invitation sent",
      data: {
        invitation_id: "inv-1",
        user_id: "user-1",
        cognito_user_id: "cognito-1",
        user_created: true,
        profile_created: true,
        user_status: "pending",
        email_sent: true,
      },
    };

    (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const result = await inviteUser(payload);

    expect(api.post).toHaveBeenCalledWith(
      "/v1/user-management/invite",
      payload
    );
    expect(result).toEqual(mockResponse);
  });

  /* -----------------------------------------
     updateUserByEmail
  ----------------------------------------- */
  it("should update user by email", async () => {
    const payload: UpdateUserPayload = {
      first_name: "Updated",
      last_name: "User",
      is_active: true,
    };

    const mockResponse = {
      message: "User updated",
      data: {
        updated_fields: ["first_name", "last_name", "is_active"],
      },
    };

    (api.put as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const email = "test@example.com";
    const result = await updateUserByEmail(email, payload);

    expect(api.put).toHaveBeenCalledWith(
      `/v1/user-management/users/${encodeURIComponent(email)}/edit`,
      payload
    );
    expect(result).toEqual(mockResponse);
  });

  /* -----------------------------------------
     changeUserRole
     Monolith expects { role: <NAME> } NOT { role_id: <UUID> }.
     See ChangeUserRolePayload comment in the service module.
  ----------------------------------------- */
  it("should change user role with role NAME (not role_id) per monolith schema", async () => {
    const payload: ChangeUserRolePayload = { role: "super-admin" };

    const mockResponse = {
      message: "User role updated",
      data: { updated_fields: ["role"] },
    };

    (api.put as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const email = "andy@prismbrainmapping.com";
    const result = await changeUserRole(email, payload);

    expect(api.put).toHaveBeenCalledWith(
      `/v1/user-management/users/${encodeURIComponent(email)}/role`,
      payload
    );
    // Regression guard: the body must carry `role` (the name) and must NOT
    // carry `role_id`. Sending role_id is the root cause of the
    // 2026-05-18 422 incident.
    const [, sentBody] = (api.put as jest.Mock).mock.calls[0];
    expect(sentBody).toHaveProperty("role", "super-admin");
    expect(sentBody).not.toHaveProperty("role_id");
    expect(result).toEqual(mockResponse);
  });

  it("encodes the email path segment in the change-role URL", async () => {
    (api.put as jest.Mock).mockResolvedValueOnce({ data: { message: "ok", data: {} } });

    const trickyEmail = "user+test@example.com";
    await changeUserRole(trickyEmail, { role: "manager" });

    expect(api.put).toHaveBeenCalledWith(
      `/v1/user-management/users/${encodeURIComponent(trickyEmail)}/role`,
      { role: "manager" }
    );
  });

  /* -----------------------------------------
     deleteUserByEmail
  ----------------------------------------- */
  it("should delete user by email", async () => {
    const mockResponse = {
      message: "User deleted",
      data: {
        email: "test@example.com",
        deletion_type: "soft_delete",
        user_was_active: true,
        had_pending_invitation: false,
        cognito_deleted: true,
      },
    };

    (api.delete as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const email = "test@example.com";
    const result = await deleteUserByEmail(email);

    expect(api.delete).toHaveBeenCalledWith(
      `/v1/user-management/users/${encodeURIComponent(email)}`
    );
    expect(result).toEqual(mockResponse);
  });

  /* -----------------------------------------
     resendInvitation
  ----------------------------------------- */
  it("should resend invitation", async () => {
    const invitationId = "inv-123";

    const mockResponse = {
      message: "Invitation resent",
      data: {
        invitation_id: invitationId,
        email: "test@example.com",
        new_token: "token-123",
        expires_at: "2026-01-01",
        email_sent: true,
      },
    };

    (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const result = await resendInvitation(invitationId);

    expect(api.post).toHaveBeenCalledWith(
      `/v1/user-management/invitations/${encodeURIComponent(invitationId)}/resend`
    );
    expect(result).toEqual(mockResponse);
  });

  /* -----------------------------------------
     purgeInactiveUsers — server-side single POST
  ----------------------------------------- */
  it("should POST to /users/purge-inactive and return the result envelope data", async () => {
    const mockResponse = {
      message: "Purge complete: 2/3 succeeded",
      data: {
        total: 3,
        succeeded: ["a@x.com", "b@x.com"],
        failed: [{ email: "c@x.com", reason: "FK violation on issue_comments" }],
      },
    };

    (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const result = await purgeInactiveUsers();

    expect(api.post).toHaveBeenCalledWith(
      "/v1/user-management/users/purge-inactive"
    );
    expect(result.total).toBe(3);
    expect(result.succeeded).toEqual(["a@x.com", "b@x.com"]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toEqual({
      email: "c@x.com",
      reason: "FK violation on issue_comments",
    });
  });

  it("should fall back to empty result when data field is missing", async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { message: "ok" },
    });

    const result = await purgeInactiveUsers();

    expect(result).toEqual({ total: 0, succeeded: [], failed: [] });
  });
});
