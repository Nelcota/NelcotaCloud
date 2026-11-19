import {
  DEFAULT_SES_REGION,
  SMTP_PRESETS,
  type SmtpProviderId,
  sesHost,
} from '@/modules/project-settings/smtp/model/smtp-presets'
import { formatSender } from '@/modules/project-settings/smtp/model/smtp-sender'
import { buildSmtpUrl, type SmtpSecurity } from '@/modules/project-settings/smtp/model/smtp-url'
import type { components } from '@/shared/api/api-schema'

type SmtpSettingsBody = components['schemas']['SmtpSettingsBody']

/** What the SMTP dialog collects, as typed; `smtpBodyOf` turns it into what the API takes. */
export type SmtpDraft = {
  provider: SmtpProviderId | null
  region: string
  host: string
  /** Kept as typed, so the field can be cleared; read through `parsePort`. */
  port: string
  security: SmtpSecurity
  username: string
  password: string
  senderName: string
  senderEmail: string
}

export const EMPTY_SMTP_DRAFT: SmtpDraft = {
  provider: null,
  region: DEFAULT_SES_REGION,
  host: '',
  port: '465',
  security: 'tls',
  username: '',
  password: '',
  senderName: '',
  senderEmail: '',
}

export const DEFAULT_PORTS: Record<SmtpSecurity, number> = { tls: 465, starttls: 587 }

const PORT_PATTERN = /^\d{1,5}$/
const MAX_PORT = 65_535
const REGION_PATTERN = /^[a-z]{2}(-[a-z]+)+-\d$/

/** Fills the server and username the provider uses; what the user typed elsewhere stays. */
export function withProvider(draft: SmtpDraft, provider: SmtpProviderId): SmtpDraft {
  const preset = SMTP_PRESETS[provider]

  return {
    ...draft,
    provider,
    host: presetHost(provider, draft.region),
    port: String(preset.port),
    security: preset.security,
    username: presetUsername(draft, preset.username),
  }
}

/** A provider's fixed username replaces the typed one; leaving such a provider clears it. */
function presetUsername(draft: SmtpDraft, fixedUsername: string): string {
  if (fixedUsername !== '') {
    return fixedUsername
  }

  if (draft.provider !== null && draft.username === SMTP_PRESETS[draft.provider].username) {
    return ''
  }

  return draft.username
}

function presetHost(provider: SmtpProviderId, region: string): string {
  if (provider === 'ses') {
    return sesHost(region)
  }

  return SMTP_PRESETS[provider].host
}

export function withRegion(draft: SmtpDraft, region: string): SmtpDraft {
  return { ...draft, region, host: sesHost(region) }
}

/** Switching security moves a default port along (465 ⇄ 587); a custom port stays. */
export function withSecurity(draft: SmtpDraft, security: SmtpSecurity): SmtpDraft {
  const port = parsePort(draft.port)

  if (port === null || Object.values(DEFAULT_PORTS).includes(port)) {
    return { ...draft, security, port: String(DEFAULT_PORTS[security]) }
  }

  return { ...draft, security }
}

/** An email address as username is usually the sender too, until the sender is changed. */
export function withUsername(draft: SmtpDraft, username: string): SmtpDraft {
  const senderEmail = draft.senderEmail

  if ((senderEmail === '' || senderEmail === draft.username) && username.includes('@')) {
    return { ...draft, username, senderEmail: username }
  }

  return { ...draft, username }
}

export function parsePort(typed: string): number | null {
  const text = typed.trim()

  if (PORT_PATTERN.test(text) === false) {
    return null
  }

  const port = Number(text)

  if (port < 1 || port > MAX_PORT) {
    return null
  }

  return port
}

export function isRegionValid(region: string): boolean {
  return REGION_PATTERN.test(region.trim())
}

/** The host alone, also when a scheme, port or path was pasted with it (the port has its field). */
export function cleanHost(typed: string): string {
  const withoutScheme = typed.trim().replace(/^[a-z]+:\/\//i, '')
  const hostAndPort = withoutScheme.split('/')[0] ?? ''

  return hostAndPort.split(':')[0] ?? ''
}

export function smtpBodyOf(draft: SmtpDraft): SmtpSettingsBody | null {
  const port = parsePort(draft.port)

  if (port === null) {
    return null
  }

  const server = {
    host: cleanHost(draft.host),
    port,
    security: draft.security,
    username: draft.username.trim(),
    password: draft.password,
  }

  return {
    smtp_url: buildSmtpUrl(server),
    email_from: formatSender(draft.senderName, draft.senderEmail),
  }
}
