import React, { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth-context'
import { type AuthContextValue, type AuthUser } from '@/types/auth-types'
import { getEmail, getToken, setEmail, setToken, setUser as storeUser, getUser as readUser, clearAuth } from '@/lib/storage'
import { syncAuthToken } from '@/lib/axios'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingVerification, setPendingVerification] = useState(false)

  // hydrate on mount
  useEffect(() => {
    (async () => {
      const [token, stored, email] = await Promise.all([getToken(), readUser(), getEmail()])
      if (token && (stored?.email || email)) {
        setUser({ id: stored?.id ?? 'me', email: stored?.email ?? (email as string), name: stored?.name ?? null, token })
        syncAuthToken(token)
      } else {
        syncAuthToken(null)
      }
      setIsLoading(false)
    })()
  }, [])

  // mocked login: persist email and set pending OTP
  async function login(email: string, _password: string): Promise<boolean> {
    void _password
    setIsLoading(true)
    await setEmail(email)
    await storeUser({ email })
    setUser({ id: 'pending', email, name: null, token: null })
    setPendingVerification(true)
    setIsLoading(false)
    return true
  }

  // mocked signup: same as login for now
  async function signup(name: string, email: string, _password: string): Promise<boolean> {
    void _password
    setIsLoading(true)
    await setEmail(email)
    await storeUser({ email, name })
    setUser({ id: 'pending', email, name, token: null })
    setPendingVerification(true)
    setIsLoading(false)
    return true
  }

  // mocked verifyOtp: grant a dummy token
  async function verifyOtp(_otp: string): Promise<boolean> {
    void _otp
    setIsLoading(true)
    const stored = await readUser()
    const email = stored?.email || (await getEmail()) || 'user@example.com'
    const token = 'dummy-access-token'
    await setToken(token)
    syncAuthToken(token)
    await storeUser({ ...(stored ?? { email }), token })
    setUser({ id: 'me', email, name: stored?.name ?? null, token })
    setPendingVerification(false)
    setIsLoading(false)
    return true
  }

  // mocked resendOtp
  async function resendOtp(): Promise<boolean> {
    return true
  }

  // mocked reset password handlers
  async function resetPasswordStart(_email: string): Promise<boolean> { void _email; return true }
  async function resetPasswordConfirm(_code: string, _newPassword: string): Promise<boolean> { void _code; void _newPassword; return true }

  async function logout(): Promise<void> {
    await clearAuth()
    syncAuthToken(null)
    setUser(null)
    setPendingVerification(false)
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    pendingVerification,
    login,
    signup,
    verifyOtp,
    resendOtp,
    resetPasswordStart,
    resetPasswordConfirm,
    logout,
  }), [user, isLoading, pendingVerification])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

