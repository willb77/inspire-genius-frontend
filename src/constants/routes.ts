export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  OTP: '/otp',
  HOME: '/home',
  DASHBOARD: '/dashboard',
  COACHES: '/coaches',
  DOCUMENTS: '/documents',
  SETTINGS: '/settings',
  HELP: '/help',
  ONBOARDING: {
    ONE: '/onboarding/one',
    TWO: '/onboarding/two',
    THREE: '/onboarding/three',
    FOUR: '/onboarding/four',
    FIVE: '/onboarding/five',
  },
  ONBOARDING_DETAILS: {
    ONE: '/onboarding/details/one',
    TWO: '/onboarding/details/two',
  },
} as const;

export const STORAGE_KEYS = {
  USER_TOKEN: 'auth_token',
  USER_EMAIL: 'user_email',
  USER_OBJ: 'auth_user_obj',
  UI_SIDEBAR_OPEN: 'ui_sidebar_open',
} as const;
