import { createContext } from 'react'

export type AuthUser = {
  id: string
  email: string
  name?: string | null
  token?: string | null
}

export type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  pendingVerification: boolean
  // Mocked handlers for now – later can be wired to real APIs/hooks
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  verifyOtp: (otp: string) => Promise<boolean>
  resendOtp: () => Promise<boolean>
  resetPasswordStart: (email: string) => Promise<boolean>
  resetPasswordConfirm: (code: string, newPassword: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
