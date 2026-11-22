import type { Insight, InsightSources } from '@/modules/overview/components/insight-types'
import { isPublicSite } from '@/modules/overview/components/setup-steps'

export function siteUrlRule({ settings }: InsightSources, base: string): Insight | null {
  if (settings === undefined) {
    return null
  }

  const action = { label: 'Definir site', to: `${base}/settings` }

  if (isPublicSite(settings.site_url) === false) {
    return {
      id: 'site-local',
      severity: 'warning',
      title: 'Aponte o site para produção',
      text: 'O site do projeto ainda é local: os links dos emails e o login social voltam para ele.',
      action,
    }
  }

  if (settings.site_url.startsWith('http://')) {
    return {
      id: 'site-http',
      severity: 'warning',
      title: 'Ative HTTPS no site',
      text: 'O site usa http, sem TLS.',
      action,
    }
  }

  return null
}

export function emailVerificationRule({ settings }: InsightSources, base: string): Insight | null {
  if (settings === undefined || settings.require_email_verification) {
    return null
  }

  return {
    id: 'email-verification',
    severity: 'warning',
    title: 'Ligue a confirmação de email',
    text: 'A confirmação de email está desligada: qualquer endereço entra sem provar que é dele.',
    action: { label: 'Ligar', to: `${base}/settings` },
  }
}

export function platformSmtpRule({ smtp }: InsightSources, base: string): Insight | null {
  if (smtp === undefined || smtp.is_custom) {
    return null
  }

  return {
    id: 'platform-smtp',
    severity: 'info',
    title: 'Envie emails pelo seu domínio',
    text: 'Os emails saem pelo servidor da plataforma, não pelo seu domínio.',
    action: { label: 'Conectar SMTP', to: `${base}/email` },
  }
}

export function socialLoginRule({ providers }: InsightSources, base: string): Insight | null {
  if (providers === undefined || providers.length > 0) {
    return null
  }

  return {
    id: 'no-social-login',
    severity: 'info',
    title: 'Ative o login social',
    text: 'Nenhum login social configurado.',
    action: { label: 'Configurar', to: `${base}/providers` },
  }
}
