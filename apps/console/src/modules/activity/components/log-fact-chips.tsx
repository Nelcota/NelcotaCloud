import type { JSX } from 'react'
import { useState } from 'react'

import type { LogFact } from '@/modules/activity/components/log-line-facts'

/** Who, from where and how fit in three chips; the rest waits behind "+N". */
const VISIBLE_FACTS = 3

/** The line's `chave=valor` chips, folded to the first three until "+N" opens the rest. */
export function LogFactChips({ facts }: { facts: LogFact[] }): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const visible = visibleFacts(facts, isExpanded)

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      {visible.map((fact) => (
        <FactChip key={`${fact.key}=${fact.value}`} fact={fact} />
      ))}
      <MoreFacts count={facts.length - visible.length} onExpand={() => setIsExpanded(true)} />
    </span>
  )
}

function FactChip({ fact }: { fact: LogFact }): JSX.Element {
  return (
    <span
      title={`${fact.key}=${fact.value}`}
      className="inline-flex h-4.5 max-w-56 min-w-0 items-center rounded-xs bg-surface px-1.5 font-mono text-2xs"
    >
      <span className="shrink-0 text-muted-foreground">{fact.key}=</span>
      <span className="truncate text-foreground">{fact.value}</span>
    </span>
  )
}

type MoreFactsProps = { count: number; onExpand: () => void }

function MoreFacts({ count, onExpand }: MoreFactsProps): JSX.Element | null {
  if (count <= 0) {
    return null
  }

  return (
    <button
      type="button"
      aria-label={`Mostrar mais ${count} campos`}
      aria-expanded={false}
      onClick={onExpand}
      className="h-4.5 rounded-xs px-1 font-mono text-2xs text-muted-foreground tabular-nums hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      +{count}
    </button>
  )
}

function visibleFacts(facts: LogFact[], isExpanded: boolean): LogFact[] {
  if (isExpanded) {
    return facts
  }

  return facts.slice(0, VISIBLE_FACTS)
}
