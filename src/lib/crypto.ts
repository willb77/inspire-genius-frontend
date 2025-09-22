// Lightweight AES-GCM encryption/decryption helpers using Web Crypto API
// NOTE: In a frontend app, this is best-effort at-rest protection only.

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

async function deriveKey(passphrase: string, salt: string) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(salt),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function bufToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBuf(b64: string) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export async function encryptString(plain: string, passphrase?: string, salt?: string): Promise<string> {
  const secret = passphrase ?? (import.meta.env.VITE_CRYPTO_KEY as string) ?? ''
  const s = salt ?? (import.meta.env.VITE_CRYPTO_SALT as string) ?? 'ig-default-salt'
  const key = await deriveKey(secret, s)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plain)
  )
  return `${bufToBase64(iv)}:${bufToBase64(cipherBuf)}`
}

export async function decryptString(payload: string, passphrase?: string, salt?: string): Promise<string> {
  const secret = passphrase ?? (import.meta.env.VITE_CRYPTO_KEY as string) ?? ''
  const s = salt ?? (import.meta.env.VITE_CRYPTO_SALT as string) ?? 'ig-default-salt'
  const key = await deriveKey(secret, s)
  const [ivB64, dataB64] = payload.split(':')
  const iv = new Uint8Array(base64ToBuf(ivB64))
  const data = base64ToBuf(dataB64)
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  return textDecoder.decode(plainBuf)
}
