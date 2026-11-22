import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import type { IconComponent } from '@/shared/ui/icon-component'
import { FieldLegend, FieldSet } from '@/shared/ui/primitives/field'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/primitives/radio-group'

export type Choice<Value extends string> = {
  value: Value
  icon: IconComponent
  title: string
  description: string
  /** Shown at the end of the card ("Recomendado", "Em breve"). */
  badge?: string
  disabled?: boolean
}

type ChoiceCardsProps<Value extends string> = {
  /** The group's name. */
  legend: string
  /** Keeps the name for screen readers where a heading already says it. */
  isLegendHidden?: boolean
  choices: readonly Choice<Value>[]
  selected: Value | null
  onSelect: (value: Value) => void
  /** Lays the cards side by side on wide screens. */
  columns?: 1 | 2 | 3
}

const COLUMNS = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }

/** One choice among a few, each a card with an icon and a sentence; arrows move between them. */
export function ChoiceCards<Value extends string>(props: ChoiceCardsProps<Value>): JSX.Element {
  function select(value: string): void {
    const choice = props.choices.find((candidate) => candidate.value === value)

    if (choice === undefined) {
      return
    }

    props.onSelect(choice.value)
  }

  return (
    <FieldSet className="min-w-0">
      <FieldLegend variant="label" className={cn((props.isLegendHidden ?? true) && 'sr-only')}>
        {props.legend}
      </FieldLegend>
      <RadioGroup
        value={props.selected ?? ''}
        onValueChange={select}
        className={cn('grid gap-2.5', COLUMNS[props.columns ?? 1])}
      >
        {props.choices.map((choice) => (
          <ChoiceCard key={choice.value} choice={choice} />
        ))}
      </RadioGroup>
    </FieldSet>
  )
}

function ChoiceCard<Value extends string>({ choice }: { choice: Choice<Value> }): JSX.Element {
  const Glyph = choice.icon

  return (
    <label
      className={cn(
        'group relative flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-surface',
        'has-data-checked:border-primary/60 has-data-checked:bg-primary/6',
        'has-disabled:cursor-not-allowed has-disabled:opacity-60',
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-surface text-muted-foreground group-has-data-checked:border-primary/40 group-has-data-checked:text-primary">
        <Glyph aria-hidden className="size-5" />
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="flex items-center gap-2 text-base font-medium text-heading">
          {choice.title}
          {choice.badge !== undefined && (
            <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
              {choice.badge}
            </span>
          )}
        </span>
        <span className="text-sm text-muted-foreground">{choice.description}</span>
      </span>
      <RadioGroupItem value={choice.value} disabled={choice.disabled} className="mt-0.5" />
    </label>
  )
}
