import type { components } from '@/shared/api/api-schema'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

/** How the confirmation dialogs name the project's own server. */
export function serverNameOf(view: SmtpSettingsView): string {
  const host = view.smtp_host

  if (host === null || host === undefined) {
    return 'Servidor próprio'
  }

  if (view.smtp_port === null || view.smtp_port === undefined) {
    return host
  }

  return `${host}:${view.smtp_port}`
}
