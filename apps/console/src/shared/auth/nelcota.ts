import { createClient } from '@nelcota/sdk'

import { API_BASE_URL } from '@/shared/api/api-base-url'

/** Fixed at build time; the platform tenant's publishable key is safe in the browser. */
const PLATFORM_PUBLISHABLE_KEY: string = import.meta.env.VITE_PLATFORM_PUBLISHABLE_KEY ?? ''

/** The console's own login: console accounts are users of the platform tenant. */
export const nelcota = createClient({
  url: API_BASE_URL,
  publishableKey: PLATFORM_PUBLISHABLE_KEY,
  storageKey: 'nelcota-console-session',
})
