/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NELCOTA_URL?: string
  readonly VITE_NELCOTA_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
