import { encryptString, decryptString } from '@/lib/crypto'
import { STORAGE_KEYS } from '@/constants/routes'
import { type StoredUser } from '@/types/auth'

// simple cache for decrypted values
const cache = new Map<string, string | null>()

function readRaw(key: string): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(key)
}

function writeRaw(key: string, value: string | null) {
  if (typeof localStorage === 'undefined') return
  if (value === null) localStorage.removeItem(key)
  else localStorage.setItem(key, value)
}

async function getDecrypted(key: string): Promise<string | null> {
  if (cache.has(key)) return cache.get(key) ?? null
  const payload = readRaw(key)
  if (!payload) { cache.set(key, null); return null }
  try {
    const plain = await decryptString(payload)
    cache.set(key, plain)
    return plain
  } catch {
    cache.set(key, null)
    return null
  }
}

async function setEncrypted(key: string, value: string) {
  const payload = await encryptString(value)
  writeRaw(key, payload)
  cache.set(key, value)
}

async function removeEncrypted(key: string) {
  writeRaw(key, null)
  cache.set(key, null)
}

export async function getToken(): Promise<string | null> {
  return getDecrypted(STORAGE_KEYS.USER_TOKEN)
}
export async function setToken(token: string): Promise<void> {
  await setEncrypted(STORAGE_KEYS.USER_TOKEN, token)
}
export async function removeToken(): Promise<void> {
  await removeEncrypted(STORAGE_KEYS.USER_TOKEN)
}

// refresh token
export async function getRefreshToken(): Promise<string | null> {
  return getDecrypted(STORAGE_KEYS.USER_REFRESH_TOKEN)
}
export async function setRefreshToken(token: string): Promise<void> {
  await setEncrypted(STORAGE_KEYS.USER_REFRESH_TOKEN, token)
}
export async function removeRefreshToken(): Promise<void> {
  await removeEncrypted(STORAGE_KEYS.USER_REFRESH_TOKEN)
}

const USER_OBJ_KEY = STORAGE_KEYS.USER_OBJ
export async function getUser(): Promise<StoredUser | null> {
  const str = await getDecrypted(USER_OBJ_KEY)
  if (!str) return null
  try { return JSON.parse(str) as StoredUser } catch { return null }
}
export async function setUser(user: StoredUser): Promise<void> {
  await setEncrypted(USER_OBJ_KEY, JSON.stringify(user))
}
export async function removeUser(): Promise<void> {
  await removeEncrypted(USER_OBJ_KEY)
}

export async function getEmail(): Promise<string | null> {
  return getDecrypted(STORAGE_KEYS.USER_EMAIL)
}
export async function setEmail(email: string): Promise<void> {
  await setEncrypted(STORAGE_KEYS.USER_EMAIL, email)
}
export async function removeEmail(): Promise<void> {
  await removeEncrypted(STORAGE_KEYS.USER_EMAIL)
}

// password (temporary, for OTP flow only)
export async function getPassword(): Promise<string | null> {
  return getDecrypted(STORAGE_KEYS.USER_PASSWORD)
}
export async function setPassword(password: string): Promise<void> {
  await setEncrypted(STORAGE_KEYS.USER_PASSWORD, password)
}
export async function removePassword(): Promise<void> {
  await removeEncrypted(STORAGE_KEYS.USER_PASSWORD)
}

// role
export async function getRole(): Promise<string | null> {
  return getDecrypted(STORAGE_KEYS.USER_ROLE)
}
export async function setRole(role: string): Promise<void> {
  await setEncrypted(STORAGE_KEYS.USER_ROLE, role)
}
export async function removeRole(): Promise<void> {
  await removeEncrypted(STORAGE_KEYS.USER_ROLE)
}

// onboarding flag
export async function getOnboardingFlag(): Promise<boolean> {
  const v = await getDecrypted(STORAGE_KEYS.USER_ONBOARDING)
  return v === '1'
}
export async function setOnboardingFlag(done: boolean): Promise<void> {
  console.log("Setting onboarding flag", done);
  await setEncrypted(STORAGE_KEYS.USER_ONBOARDING, done ? '1' : '0')
}
export async function removeOnboardingFlag(): Promise<void> {
  await removeEncrypted(STORAGE_KEYS.USER_ONBOARDING)
}

// session (for OTP flow)
export async function getSession(): Promise<string | null> {
  return getDecrypted(STORAGE_KEYS.USER_SESSION)
}
export async function setSession(session: string): Promise<void> {
  await setEncrypted(STORAGE_KEYS.USER_SESSION, session)
}
export async function removeSession(): Promise<void> {
  await removeEncrypted(STORAGE_KEYS.USER_SESSION)
}

// next_step persistence (for OTP flow branching)
export async function getNextStep(): Promise<string | null> {
  return getDecrypted(STORAGE_KEYS.USER_NEXT_STEP)
}
export async function setNextStep(step: string): Promise<void> {
  await setEncrypted(STORAGE_KEYS.USER_NEXT_STEP, step)
}
export async function removeNextStep(): Promise<void> {
  await removeEncrypted(STORAGE_KEYS.USER_NEXT_STEP)
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    removeToken(),
    removeRefreshToken(),
    removeEmail(),
    removePassword(),
    removeRole(),
    removeOnboardingFlag(),
    removeSession(),
    removeNextStep(),
    removeUser(),
  ])
}

// keep cache in sync across tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key) return
    cache.set(e.key, null)
  })
}

// UI helpers (non-sensitive). Stored as plain values.
export function getUIFlag(key: string): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(key) === '1'
}
export function setUIFlag(key: string, value: boolean): void {
  if (typeof localStorage === 'undefined') return
  if (value) localStorage.setItem(key, '1')
  else localStorage.removeItem(key)
}
