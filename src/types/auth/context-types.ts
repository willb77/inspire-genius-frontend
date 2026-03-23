// Auth context related types

import type { LoginDataPayload } from "./api-types"
import type { UserRole } from "@/types/roles"

export type AuthUser = {
  id: string
  email: string
  name?: string | null
  fullName?: string | null
  token?: string | null
  role?: UserRole | string | null
  isOnboardingCompleted?: boolean
}

export type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  pendingVerification: boolean
  /** Check if the current user has exactly this role */
  hasRole: (role: UserRole) => boolean
  /** Check if the current user's role is at least this level in the hierarchy */
  isAtLeast: (role: UserRole) => boolean
  // Auth actions
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
  markOnboardingCompleted: () => Promise<void>
  markFullName: (fullName: string) => Promise<void>
  completeAuthFromPayload: (payload: LoginDataPayload, fallbackEmail: string, options?: { message?: string; clearNextStep?: boolean }) => Promise<void>
}
