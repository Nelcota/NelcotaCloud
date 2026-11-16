/** Base URL of the NelcotaCloud API, fixed at build time (VITE_API_URL). */
const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function checkApiHealth(): Promise<void> {
  const response = await fetch(`${API_URL}/health`)

  if (response.ok === false) {
    throw new ApiError(response.status, `API answered ${response.status}`)
  }
}

export function apiUrl(): string {
  return API_URL
}
