export type BaseApiResponse<T> = {
  status?: boolean
  success?: boolean
  message?: string
  error_status?: {
    code?: string
    description?: string
  }
  data?: T
}