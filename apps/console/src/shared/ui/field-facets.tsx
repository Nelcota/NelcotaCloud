import { ChevronDown } from 'lucide-react'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/primitives/collapsible'

export type FacetValue = { value: string; label: string; count: number }

export type Facet = { field: string; values: readonly FacetValue[] }

type FieldFacetsProps = {
  facets: readonly Facet[]
  /** The value chosen for each field, if any; choosing it again clears it. */
  selected: Readonly<Record<string, string | undefined>>
  onSelect: (field: string, value: string | undefined) => void
}

/** "Campos detectados": each field of the loaded lines with how often each value appears. */
export function FieldFacets({ facets, selected, onSelect }: FieldFacetsProps): JSX.Element {
  return (
    <div className="grid gap-1 font-mono text-2xs">
      {facets.map((facet) => (
        <FacetGroup
          key={facet.field}
          facet={facet}
          selected={selected[facet.field]}
          onSelect={(value) => onSelect(facet.field, value)}
        />
      ))}
    </div>
  )
}

type FacetGroupProps = {
  facet: Facet
  selected: string | undefined
  onSelect: (value: string | undefined) => void
}

function FacetGroup({ facet, selected, onSelect }: FacetGroupProps): JSX.Element {
  const highest = Math.max(1, ...facet.values.map((entry) => entry.count))

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="group/facet flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-foreground hover:bg-surface">
        <ChevronDown
          aria-hidden
          className="size-3 text-muted-foreground transition-transform duration-200 group-data-[state=closed]/facet:-rotate-90"
        />
        <span className="flex-1 truncate text-start font-medium">{facet.field}</span>
        <span className="text-muted-foreground tabular-nums">
          <span className="sr-only">, </span>
          {facet.values.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-px py-0.5">
        {facet.values.map((entry) => (
          <button
            key={entry.value}
            type="button"
            aria-pressed={selected === entry.value}
            title={entry.label}
            onClick={() => onSelect(nextSelection(selected, entry.value))}
            className={cn(
              'grid grid-cols-[minmax(0,1fr)_3rem_2.5rem] items-center gap-2 rounded-md py-1 ps-6 pe-1.5 text-start text-muted-foreground hover:bg-surface hover:text-foreground',
              selected === entry.value && 'bg-surface-hover text-foreground',
            )}
          >
            <span className="line-clamp-2 wrap-break-word">{entry.label}</span>
            <span aria-hidden className="h-0.5 overflow-hidden rounded-full bg-surface-hover">
              <span
                className="block h-full rounded-full bg-muted-foreground/60"
                style={{ width: `${(entry.count / highest) * 100}%` }}
              />
            </span>
            <span className="text-end tabular-nums">{entry.count}</span>
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function nextSelection(current: string | undefined, picked: string): string | undefined {
  if (current === picked) {
    return undefined
  }

  return picked
}
