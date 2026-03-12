export const ROUTES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  OTP: "/otp",
  RESET: "/reset-password",
  HOME: "/home",
  DASHBOARD: "/dashboard",
  COACHES: "/coaches",
  DOCUMENTS: "/documents",
  SETTINGS: "/settings",
  HELP: "/help",
  SUPER_ADMIN: {
    BASE: "/super-admin",
    DASHBOARD: "/super-admin/dashboard",
    TEAM: "/super-admin/team",
    COACHES: "/super-admin/coaches",
    ORGANIZATIONS: "/super-admin/organizations",
    USERS: "/super-admin/users",
    SETTINGS: "/super-admin/settings",
    PROJECT_LOG: "/super-admin/project-log",
  },
  ONBOARDING: {
    ONE: "/onboarding/one",
    TWO: "/onboarding/two",
    THREE: "/onboarding/three",
    FOUR: "/onboarding/four",
    FIVE: "/onboarding/five",
  },
  ONBOARDING_DETAILS: {
    ONE: "/onboarding/details/one",
    TWO: "/onboarding/details/two",
  },
} as const;

export const NEXT_STEPS = {
  VERIFY_MFA: "verify_mfa",
  CREATE_PROFILE: "create_profile",
  VERIFY_EMAIL: "verify_email",
  RESEND_OTP: "resend_otp",
} as const;

export const ROLES = {
  SUPER_ADMIN: "super-admin",
  USER: "user",
} as const;

export const PATHS = {
  SUPER_ADMIN_PREFIX: "/super-admin",
} as const;

export const STORAGE_KEYS = {
  USER_TOKEN: "auth_token",
  USER_EMAIL: "user_email",
  USER_OBJ: "auth_user_obj",
  USER_REFRESH_TOKEN: "auth_refresh_token",
  USER_ROLE: "auth_role",
  USER_ONBOARDING: "auth_onboarding_done",
  USER_PASSWORD: "user_password",
  USER_SESSION: "auth_session",
  USER_NEXT_STEP: "auth_next_step",
  UI_SIDEBAR_OPEN: "ui_sidebar_open",
  UI_ALEX_FLOATING_OPEN: "ui_alex_floating_open",
} as const;
