/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Publishable key of the platform tenant, whose users are the console accounts. */
  readonly VITE_PLATFORM_PUBLISHABLE_KEY?: string
  /** Comma-separated OAuth providers configured on the platform tenant: `google,github`. */
  readonly VITE_CONSOLE_OAUTH_PROVIDERS?: string
  /** Support address shown on login, MFA and error pages; omitted when unset. */
  readonly VITE_SUPPORT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
