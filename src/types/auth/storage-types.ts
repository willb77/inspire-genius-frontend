// Auth storage related types

export type StoredUser = {
  id?: string
  email: string
  name?: string | null
  role?: string
  token?: string
}
