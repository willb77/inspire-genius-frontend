import { encryptString, decryptString } from '@/lib/crypto'
import { STORAGE_KEYS } from '@/constants/routes'

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

export type StoredUser = {
  id?: string
  email: string
  name?: string | null
  role?: string
  token?: string
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

export async function clearAuth(): Promise<void> {
  await Promise.all([removeToken(), removeEmail(), removeUser()])
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
