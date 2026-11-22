import type { JSX } from 'react'

import { LevelBadge, type LogLevel } from '@/shared/ui/level-badge'

type SampleEvent = { time: string; level: LogLevel; message: string; fact: string }

/** Illustrative lines in the activity log's format; no real data is read on this page. */
const EVENTS: readonly SampleEvent[] = [
  { time: '12:04:11,208', level: 'info', message: 'Conta criada', fact: 'método=senha' },
  { time: '12:04:12,551', level: 'info', message: 'Login', fact: 'ip=189.6.20.14' },
  { time: '12:04:19,032', level: 'warn', message: 'Login recusado', fact: 'ip=203.0.113.7' },
  { time: '12:05:02,770', level: 'info', message: 'MFA ativado', fact: 'origem=App' },
  { time: '12:05:40,114', level: 'info', message: 'Chave de API criada', fact: 'origem=Console' },
]

/** The activity log as it reads in the console: time, level, event and one fact. */
export function ShowcaseEventsCard(): JSX.Element {
  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background">
      <figcaption className="flex items-center justify-between border-b border-border/60 px-3.5 py-2 font-mono text-2xs text-muted-foreground">
        Atividade
        <span>exemplo</span>
      </figcaption>
      <ol className="grid gap-px p-1.5 font-mono text-2xs">
        {EVENTS.map((event, index) => (
          <li
            key={event.time}
            className="flex animate-row-in items-center gap-2 rounded-md px-2 py-1"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
              {event.time}
              <LevelBadge level={event.level} />
            </span>
            <span className="truncate text-foreground">
              {event.message} <span className="text-muted-foreground">{event.fact}</span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  )
}
