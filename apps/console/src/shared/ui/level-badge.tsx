import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'

export type LogLevel = 'info' | 'warn' | 'error'

const CODES: Record<LogLevel, string> = { info: 'INF', warn: 'WRN', error: 'ERR' }
const NAMES: Record<LogLevel, string> = { info: 'Informação', warn: 'Aviso', error: 'Erro' }

const TONES: Record<LogLevel, string> = {
  info: 'bg-faint/12 text-muted-foreground',
  warn: 'bg-warning/12 text-warning',
  error: 'bg-destructive/14 text-destructive',
}

/** The three-letter level of a log line; errors stand out, the rest stay quiet. */
export function LevelBadge({ level }: { level: LogLevel }): JSX.Element {
  return (
    <span
      title={NAMES[level]}
      className={cn(
        'inline-flex h-[18px] w-[34px] shrink-0 items-center justify-center rounded-xs font-mono text-[10px] leading-none font-semibold tracking-[0.02em]',
        TONES[level],
      )}
    >
      <span aria-hidden>{CODES[level]}</span>
      <span className="sr-only">{NAMES[level]}</span>
    </span>
  )
}
