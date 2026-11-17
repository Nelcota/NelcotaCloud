import Check from '~icons/solar/check-read-linear'
import type { JSX } from 'react'
import { useId } from 'react'

import { cn } from '@/shared/lib/class-names'
import type { IconComponent } from '@/shared/ui/icon-component'

export type Choice<Value extends string> = {
  value: Value
  icon: IconComponent
  title: string
  description: string
}

type ChoiceCardsProps<Value extends string> = {
  /** Read by screen readers as the group's name. */
  legend: string
  choices: Choice<Value>[]
  selected: Value | null
  onSelect: (value: Value) => void
}

/**
 * One choice among a few, each explained in a sentence; native radios, so arrows move between
 * them. Two columns only when its own width allows, whatever the screen.
 */
export function ChoiceCards<Value extends string>(props: ChoiceCardsProps<Value>): JSX.Element {
  const name = useId()

  return (
    <div className="@container">
      <fieldset className="grid gap-3 @lg:grid-cols-2">
        <legend className="sr-only">{props.legend}</legend>
        {props.choices.map((choice) => (
          <ChoiceCard
            key={choice.value}
            name={name}
            choice={choice}
            isSelected={props.selected === choice.value}
            onSelect={() => props.onSelect(choice.value)}
          />
        ))}
      </fieldset>
    </div>
  )
}

type ChoiceCardProps<Value extends string> = {
  name: string
  choice: Choice<Value>
  isSelected: boolean
  onSelect: () => void
}

function ChoiceCard<Value extends string>(props: ChoiceCardProps<Value>): JSX.Element {
  const Icon = props.choice.icon

  return (
    <label
      className={cn(
        'hover:bg-accent/60 has-[:focus-visible]:ring-ring/50 relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-[:focus-visible]:ring-3',
        props.isSelected && 'border-foreground/50 bg-accent/60',
      )}
    >
      <input
        type="radio"
        name={props.name}
        value={props.choice.value}
        checked={props.isSelected}
        onChange={props.onSelect}
        className="sr-only"
      />
      <Icon
        aria-hidden="true"
        className={cn(
          'text-muted-foreground mt-0.5 size-5 shrink-0',
          props.isSelected && 'text-foreground',
        )}
      />
      <span className="grid gap-1">
        <span className="font-medium">{props.choice.title}</span>
        <span className="text-muted-foreground text-xs text-pretty">
          {props.choice.description}
        </span>
      </span>
      <SelectedMark isSelected={props.isSelected} />
    </label>
  )
}

/** A filled check in the corner, so the choice reads without relying on the border colour. */
function SelectedMark({ isSelected }: { isSelected: boolean }): JSX.Element | null {
  if (isSelected === false) {
    return null
  }

  return (
    <span
      aria-hidden="true"
      className="bg-foreground text-background ml-auto flex size-5 shrink-0 items-center justify-center rounded-full"
    >
      <Check className="size-3.5" />
    </span>
  )
}
