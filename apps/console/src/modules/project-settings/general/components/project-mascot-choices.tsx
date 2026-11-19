import Check from '~icons/solar/check-circle-linear'
import type { JSX } from 'react'
import { useId } from 'react'

import { ProjectAvatar } from '@/modules/projects/components/project-avatar'
import { AUTOMATIC_MASCOT, PROJECT_MASCOTS } from '@/modules/projects/model/project-mascots'
import { cn } from '@/shared/lib/class-names'

type MascotChoicesProps = {
  projectId: string
  selection: number
  disabled: boolean
  onSelect: (mascotId: number) => void
}

export function ProjectMascotChoices({ disabled, ...choice }: MascotChoicesProps): JSX.Element {
  const name = useId()

  return (
    <fieldset className="@container grid min-w-0 gap-2" disabled={disabled}>
      <legend className="sr-only">Mascote do projeto</legend>
      <MascotChoice {...choice} name={name} mascotId={AUTOMATIC_MASCOT} label="Automático" />
      <div className="grid grid-cols-4 gap-2 @md:grid-cols-8">
        {PROJECT_MASCOTS.map((label, index) => (
          <MascotChoice {...choice} key={label} name={name} mascotId={index + 1} label={label} />
        ))}
      </div>
    </fieldset>
  )
}

type MascotChoiceProps = Omit<MascotChoicesProps, 'disabled'> & {
  name: string
  mascotId: number
  label: string
}

function MascotChoice(props: MascotChoiceProps): JSX.Element {
  const isAutomatic = props.mascotId === AUTOMATIC_MASCOT

  return (
    <label
      className={cn(
        'bg-muted/35 hover:bg-accent has-[:checked]:border-foreground/50 has-[:checked]:bg-accent has-[:focus-visible]:outline-ring relative flex min-h-14 cursor-pointer items-center justify-center rounded-lg border border-transparent transition-colors has-[:disabled]:cursor-progress has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 motion-safe:active:scale-[0.97]',
        isAutomatic && 'justify-start gap-2 px-2',
      )}
    >
      <input
        type="radio"
        name={props.name}
        value={props.mascotId}
        checked={props.selection === props.mascotId}
        onChange={() => props.onSelect(props.mascotId)}
        className="peer sr-only"
      />
      <ProjectAvatar projectId={props.projectId} mascotId={props.mascotId} />
      <span className={cn('text-sm font-medium', isAutomatic === false && 'sr-only')}>
        {props.label}
      </span>
      <Check
        aria-hidden="true"
        className="absolute top-1 right-1 hidden size-4 peer-checked:block"
      />
    </label>
  )
}
