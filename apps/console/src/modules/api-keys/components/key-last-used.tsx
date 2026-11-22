import type { JSX } from 'react'

import { Timestamp } from '@/shared/ui/timestamp'

/** Recency matters more than the exact time here; the exact one shows on hover. */
export function KeyLastUsed({
  lastUsedAt,
}: {
  lastUsedAt: string | null | undefined
}): JSX.Element {
  if (lastUsedAt === null || lastUsedAt === undefined) {
    return <span className="text-muted-foreground">Nunca</span>
  }

  return <Timestamp value={lastUsedAt} format="relative" />
}
