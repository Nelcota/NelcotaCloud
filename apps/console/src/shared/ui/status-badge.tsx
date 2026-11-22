import type { JSX, ReactNode } from 'react'

import { Badge } from '@/shared/ui/primitives/badge'

export type StatusTone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand'

const VARIANTS = {
  neutral: 'muted',
  success: 'success',
  warning: 'warning',
  error: 'destructive',
  info: 'info',
  brand: 'default',
} as const

/** A short state next to a record ("Ativa", "Banido", "Dono"). */
export function StatusBadge({
  tone = 'neutral',
  children,
  icon,
}: {
  tone?: StatusTone
  children: ReactNode
  icon?: ReactNode
}): JSX.Element {
  return (
    <Badge variant={VARIANTS[tone]}>
      {icon}
      {children}
    </Badge>
  )
}
