// Auth context related types

export type AuthUser = {
  id: string
  email: string
  name?: string | null
  token?: string | null
  role?: string | null
  isOnboardingCompleted?: boolean
}

export type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  pendingVerification: boolean
  // Mocked handlers for now – later can be wired to real APIs/hooks
  login: (email: string, password: string) => Promise<{ status: boolean }>
  signup: (
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<boolean>
  verifyOtp: (otp: string) => Promise<boolean>
  resendOtp: () => Promise<boolean>
  resetPasswordStart: (email: string) => Promise<boolean>
  resetPasswordConfirm: (code: string, newPassword: string) => Promise<boolean>
  logout: () => Promise<void>
  clearAuth: () => Promise<void>
  setPendingVerification: (pending: boolean) => void
}
