import { type Page, expect } from "@playwright/test";

/**
 * Role credentials for smoke tests.
 * In CI these are intercepted at the network level; locally they can hit a real backend.
 */
export const ROLE_CREDENTIALS: Record<
  string,
  { email: string; password: string; role: string; dashboardHeading: RegExp }
> = {
  user: {
    email: "testuser@inspiregeniusapp.com",
    password: "Test1234!",
    role: "user",
    dashboardHeading: /welcome|home|dashboard/i,
  },
  manager: {
    email: "manager@inspiregeniusapp.com",
    password: "Test1234!",
    role: "manager",
    dashboardHeading: /manager|team|dashboard/i,
  },
  "company-admin": {
    email: "companyadmin@inspiregeniusapp.com",
    password: "Test1234!",
    role: "company-admin",
    dashboardHeading: /company|organization|dashboard/i,
  },
  practitioner: {
    email: "practitioner@inspiregeniusapp.com",
    password: "Test1234!",
    role: "practitioner",
    dashboardHeading: /practitioner|coach|dashboard/i,
  },
  distributor: {
    email: "distributor@inspiregeniusapp.com",
    password: "Test1234!",
    role: "distributor",
    dashboardHeading: /distributor|credits|dashboard/i,
  },
  "super-admin": {
    email: "admin@inspiregeniusapp.com",
    password: "Test1234!",
    role: "super-admin",
    dashboardHeading: /super admin|admin|dashboard/i,
  },
};

/**
 * Build a mock login API response for a given role.
 */
function buildLoginResponse(role: string, email: string) {
  return {
    status: true,
    message: "Login successful",
    data: {
      access_token: `mock-access-token-${role}`,
      refresh_token: `mock-refresh-token-${role}`,
      id_token: `mock-id-token-${role}`,
      token_type: "Bearer",
      user_id: `test-${role}-001`,
      email,
      full_name: `Test ${role.replace(/-/g, " ")}`,
      role,
      has_profile: true,
      is_onboarded: true,
      organization_id: "org-test-001",
      business_id: "biz-test-001",
      mfa_required: false,
      next_step: null,
    },
  };
}

/**
 * Build a mock /v1/me response for a given role.
 */
function buildMeResponse(role: string, email: string) {
  return {
    status: true,
    message: "OK",
    data: {
      sub: `test-${role}-001`,
      groups: [role],
      user_role: role,
      is_onboarded: "true",
      email,
      first_name: "Test",
      last_name: role.replace(/-/g, " "),
      full_name: `Test ${role.replace(/-/g, " ")}`,
      is_password_change_allowed: true,
      role,
    },
  };
}

/**
 * Install API mocks for login, me, and common endpoints.
 * Called once per test — intercepts all API calls that would fail without a backend.
 */
async function installApiMocks(page: Page, role: string, email: string) {
  // Mock login
  await page.route("**/v1/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildLoginResponse(role, email)),
    });
  });

  // Mock /v1/me
  await page.route("**/v1/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildMeResponse(role, email)),
    });
  });

  // Mock refresh token
  await page.route("**/v1/refresh-token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: true,
        data: {
          access_token: `mock-refreshed-token-${role}`,
          refresh_token: `mock-refresh-token-${role}`,
        },
      }),
    });
  });

  // Mock audit log (fire-and-forget, prevent 404 noise)
  await page.route("**/v1/audit/**", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ status: "accepted" }),
    });
  });

  // Catch-all for other API calls — return empty success to prevent errors
  await page.route("**/v1/**", async (route) => {
    // Let already-handled routes pass through, fulfill unhandled ones
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: true, data: {}, message: "OK" }),
    });
  });
}

/**
 * Login helper — installs API mocks, navigates to /login, and authenticates.
 */
export async function loginAs(page: Page, role: string) {
  const creds = ROLE_CREDENTIALS[role];
  if (!creds) throw new Error(`Unknown role: ${role}`);

  // Install API mocks before navigating
  await installApiMocks(page, creds.role, creds.email);

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Click "Sign in with password" if the magic-link form is shown first
  const passwordBtn = page.getByRole("button", {
    name: /sign in with password/i,
  });
  if (await passwordBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await passwordBtn.click();
  }

  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: "Log In" }).click();

  // Wait for navigation away from /login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
}
