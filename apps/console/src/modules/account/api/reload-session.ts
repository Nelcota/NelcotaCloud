import { nelcota } from '@/shared/auth/nelcota'

/** A refresh returns the account as the API sees it now, e.g. with its email just confirmed. */
export async function reloadSession(): Promise<void> {
  await nelcota.auth.refreshSession()
}
