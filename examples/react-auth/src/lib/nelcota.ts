import { createClient } from '@nelcota/sdk'

function readSetting(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    throw new Error(`Set ${name} in .env.local (see .env.example).`)
  }

  return value
}

/** One client for the whole app: it keeps the session and renews it before it expires. */
export const nelcota = createClient({
  url: readSetting('VITE_NELCOTA_URL', import.meta.env.VITE_NELCOTA_URL),
  publishableKey: readSetting(
    'VITE_NELCOTA_PUBLISHABLE_KEY',
    import.meta.env.VITE_NELCOTA_PUBLISHABLE_KEY,
  ),
})
