import type { JSX } from 'react'

import { StatusBadge, type StatusTone } from '@/shared/ui/status-badge'

type KindBadge = { label: string; tone: StatusTone }

/** A secret key is the one that must never leave the server, so it is the one that stands out. */
const KIND_BADGES: Record<string, KindBadge> = {
  publishable: { label: 'Publicável', tone: 'neutral' },
  secret: { label: 'Secreta', tone: 'warning' },
}

export function KeyKindBadge({ kind }: { kind: string }): JSX.Element {
  const badge = KIND_BADGES[kind] ?? { label: kind, tone: 'neutral' }

  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
}
