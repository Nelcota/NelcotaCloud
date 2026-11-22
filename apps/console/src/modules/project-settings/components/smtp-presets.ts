import { Server } from 'lucide-react'
import AmazonSesLogo from '~icons/logos/aws-ses'
import GmailLogo from '~icons/logos/google-gmail'
import MicrosoftLogo from '~icons/logos/microsoft-icon'

import { ResendLogo } from '@/modules/project-settings/components/resend-logo'
import type { SmtpSecurity } from '@/modules/project-settings/components/smtp-url'
import type { Choice } from '@/shared/ui/choice-cards'

export type SmtpProviderId = 'gmail' | 'outlook' | 'ses' | 'resend' | 'other'

export type SmtpPreset = {
  title: string
  /** Empty when the host depends on more than the provider (SES region, any other server). */
  host: string
  port: number
  security: SmtpSecurity
  /** Prefilled when the provider uses a fixed username (Resend). */
  username: string
  /** What the provider expects as username and password, when it is not obvious. */
  loginHint?: string
  loginLink?: { url: string; label: string }
}

export const DEFAULT_SES_REGION = 'us-east-1'

export const SMTP_PRESETS: Record<SmtpProviderId, SmtpPreset> = {
  gmail: {
    title: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    security: 'tls',
    username: '',
    loginHint:
      'Use o seu endereço do Gmail e uma senha de app, não a senha da conta. A senha de app exige a verificação em duas etapas ativa.',
    loginLink: { url: 'https://myaccount.google.com/apppasswords', label: 'Criar senha de app' },
  },
  outlook: {
    title: 'Outlook / Microsoft 365',
    host: 'smtp.office365.com',
    port: 587,
    security: 'starttls',
    username: '',
    loginHint: 'Use o seu endereço de email e a senha dessa conta Microsoft.',
  },
  ses: {
    title: 'Amazon SES',
    host: '',
    port: 465,
    security: 'tls',
    username: '',
    loginHint: 'Use as credenciais SMTP criadas no SES. Elas não são as chaves de acesso da AWS.',
    loginLink: { url: 'https://console.aws.amazon.com/ses/home#/smtp', label: 'Abrir SMTP no SES' },
  },
  resend: {
    title: 'Resend',
    host: 'smtp.resend.com',
    port: 465,
    security: 'tls',
    username: 'resend',
    loginHint: 'O usuário é resend e a senha é uma API key do Resend.',
    loginLink: { url: 'https://resend.com/api-keys', label: 'Criar API key' },
  },
  other: { title: 'Outro', host: '', port: 465, security: 'tls', username: '' },
}

export const SMTP_PROVIDER_CHOICES: Choice<SmtpProviderId>[] = [
  { value: 'gmail', icon: GmailLogo, title: 'Gmail', description: 'Com uma senha de app.' },
  {
    value: 'outlook',
    icon: MicrosoftLogo,
    title: 'Outlook / Microsoft 365',
    description: 'Com a sua conta Microsoft.',
  },
  {
    value: 'ses',
    icon: AmazonSesLogo,
    title: 'Amazon SES',
    description: 'Na região da sua conta AWS.',
  },
  { value: 'resend', icon: ResendLogo, title: 'Resend', description: 'Com uma API key do Resend.' },
  { value: 'other', icon: Server, title: 'Outro', description: 'Qualquer servidor SMTP com TLS.' },
]

/** SES has one SMTP endpoint per AWS region. */
export function sesHost(region: string): string {
  return `email-smtp.${region.trim()}.amazonaws.com`
}
