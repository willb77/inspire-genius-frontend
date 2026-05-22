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
    patch: jest.fn(),
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

     Issue #204 (2026-05-21): repointed from monolith
     /v1/user-management/invite (writes to phantom local-postgres on EC2)
     to auth-service /v1/admin/invite-user (writes to main Aurora atomically).
  ----------------------------------------- */
  it("should invite a user via auth-service /v1/admin/invite-user (#204)", async () => {
    const payload: InviteUserPayload = {
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "user",
    };

    const mockResponse = {
      message: "User invited successfully.",
      data: {
        user_id: "cognito-sub-uuid",
        email: "test@example.com",
        role: "user",
        cognito_user_status: "FORCE_CHANGE_PASSWORD",
        invited_by: "admin@example.com",
      },
    };

    (api.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const result = await inviteUser(payload);

    expect(api.post).toHaveBeenCalledWith(
      "/v1/admin/invite-user",
      payload
    );
    // Issue #204 regression guard: callers must NOT send role_id —
    // auth-service expects role NAME and resolves it server-side.
    const sentBody = (api.post as jest.Mock).mock.calls[0][1];
    expect(sentBody).not.toHaveProperty("role_id");
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

  /* -----------------------------------------
     getUserInvitation
  ----------------------------------------- */
  it("should fetch invitation details for a user", async () => {
    const userId = "user-abc";
    const mockResponse = {
      message: "Invitation fetched",
      data: {
        invitation_id: "inv-1",
        status: "pending",
        stored_status: "pending",
        expires_at: "2026-06-01T00:00:00+00:00",
        sent_at: "2026-05-15T00:00:00+00:00",
        role: "manager",
        role_id: "role-1",
        email: "u@x.com",
        organization_id: null,
      },
    };

    (api.get as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

    const { getUserInvitation } = await import("../user-management.service");
    const result = await getUserInvitation(userId);

    expect(api.get).toHaveBeenCalledWith(
      `/v1/user-management/users/${encodeURIComponent(userId)}/invitation`,
    );
    expect(result.invitation_id).toBe("inv-1");
    expect(result.status).toBe("pending");
    expect(result.email).toBe("u@x.com");
  });

  it("should throw when getUserInvitation response is missing data envelope", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { message: "boom" },
    });

    const { getUserInvitation } = await import("../user-management.service");
    await expect(getUserInvitation("user-x")).rejects.toThrow(
      /boom|Failed to fetch invitation/,
    );
  });

  /* -----------------------------------------
     updateInvitationExpiry
  ----------------------------------------- */
  it("should PATCH expires_at to the user invitation endpoint", async () => {
    const userId = "user-abc";
    const expires = "2026-07-01T00:00:00.000Z";
    const mockResponse = {
      message: "Invitation expiry updated",
      data: {
        invitation_id: "inv-1",
        email: "u@x.com",
        status: "pending",
        expires_at: expires,
      },
    };

    (api.patch as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
    });

    const { updateInvitationExpiry } = await import(
      "../user-management.service"
    );
    const result = await updateInvitationExpiry(userId, expires);

    expect(api.patch).toHaveBeenCalledWith(
      `/v1/user-management/users/${encodeURIComponent(userId)}/invitation`,
      { expires_at: expires },
    );
    expect(result.expires_at).toBe(expires);
    expect(result.status).toBe("pending");
  });

  it("encodes user_id path segment in invitation URLs", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        message: "ok",
        data: {
          invitation_id: "x",
          status: "pending",
          stored_status: "pending",
          expires_at: null,
          sent_at: null,
          role: null,
          role_id: null,
          email: "x@x.com",
          organization_id: null,
        },
      },
    });

    const trickyId = "user/with/slashes";
    const { getUserInvitation } = await import("../user-management.service");
    await getUserInvitation(trickyId);

    expect(api.get).toHaveBeenCalledWith(
      `/v1/user-management/users/${encodeURIComponent(trickyId)}/invitation`,
    );
  });
});
