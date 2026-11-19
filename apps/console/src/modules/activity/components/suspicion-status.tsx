import DangerTriangle from '~icons/solar/danger-triangle-linear'
import ShieldCheck from '~icons/solar/shield-check-linear'
import type { JSX, ReactNode } from 'react'

import { THREAT_TONE } from '@/modules/activity/components/audit-row-style'
import { SUSPICION_RULE } from '@/modules/activity/model/suspicious-addresses'
import { cn } from '@/shared/lib/class-names'

/**
 * The answer the page is for, with the rule behind it, so "suspeito" is never a mystery. A
 * quiet project gets an explicit all-clear, not just silence.
 */
export function SuspicionStatus({ count }: { count: number }): JSX.Element {
  if (count === 0) {
    return (
      <Status
        icon={<ShieldCheck aria-hidden="true" className="size-4" />}
        tone="text-emerald-700 dark:text-emerald-400"
      >
        Nenhum IP suspeito
      </Status>
    )
  }

  return (
    <Status icon={<DangerTriangle aria-hidden="true" className="size-4" />} tone={THREAT_TONE}>
      {suspiciousText(count)}
    </Status>
  )
}

type StatusProps = { icon: ReactNode; tone: string; children: string }

function Status({ icon, tone, children }: StatusProps): JSX.Element {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 font-medium', tone)}
      title={SUSPICION_RULE}
    >
      {icon}
      {children}
      <span className="sr-only">. {SUSPICION_RULE}</span>
    </span>
  )
}

function suspiciousText(count: number): string {
  if (count === 1) {
    return '1 IP suspeito'
  }

  return `${count} IPs suspeitos`
}
