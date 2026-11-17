import LockKeyhole from '~icons/solar/lock-keyhole-linear'
import ShieldKeyhole from '~icons/solar/shield-keyhole-linear'

import type { SmtpSecurity } from '@/modules/project-settings/components/smtp-url'
import type { Choice } from '@/shared/ui/choice-cards'

export const SECURITY_LABELS: Record<SmtpSecurity, string> = {
  tls: 'TLS direto (porta 465)',
  starttls: 'STARTTLS (porta 587)',
}

export const SECURITY_CHOICES: Choice<SmtpSecurity>[] = [
  {
    value: 'tls',
    icon: LockKeyhole,
    title: SECURITY_LABELS.tls,
    description: 'A mais comum. A conexão já começa protegida.',
  },
  {
    value: 'starttls',
    icon: ShieldKeyhole,
    title: SECURITY_LABELS.starttls,
    description:
      'Usada pelo Outlook e pelo Microsoft 365. A conexão é protegida logo depois de abrir.',
  },
]
