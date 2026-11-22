import User from '~icons/solar/user-linear'
import { useId, type JSX } from 'react'

import type { ActionTarget } from '@/modules/team/components/action-target'
import { ACTION_COPY } from '@/modules/team/components/team-action-copy'
import { type MemberAction, leaveBlockedReason } from '@/modules/team/components/team-row-actions'
import { type MemberRow, ownerCount } from '@/modules/team/components/team-rows'
import type { components } from '@/shared/api/api-schema'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type TeamView = components['schemas']['TeamView']

type LeaveProjectSectionProps = {
  team: TeamView
  /** The viewer's own membership; `null` while the list does not include it yet. */
  ownRow: MemberRow | null
  onAction: (target: ActionTarget, action: MemberAction) => Promise<void>
}

/** Leaving, in a danger panel at the end of the page; the project always keeps an owner. */
export function LeaveProjectSection(props: LeaveProjectSectionProps): JSX.Element | null {
  const { team, ownRow } = props
  const titleId = useId()

  // Alone on the project there is nobody to hand it to; the note under the list already says so.
  if (ownRow === null || team.members.length === 1) {
    return null
  }

  const copy = ACTION_COPY.leave
  const blockedReason = leaveBlockedReason({
    isSoleOwner: ownRow.role === 'owner' && ownerCount(team) === 1,
    hasOthers: team.members.length > 1,
  })
  const target = { row: ownRow, name: 'você', isOwnRow: true }

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-card p-5"
    >
      <div className="grid max-w-prose min-w-0 flex-1 gap-1">
        <h2 id={titleId} className="text-base font-semibold">
          Sair do projeto
        </h2>
        <p className="text-sm text-muted-foreground">
          {blockedReason ?? 'Você perde o acesso na hora e só volta com um novo convite.'}
        </p>
      </div>
      <ConfirmButton
        label={copy.label}
        icon={copy.icon}
        title={copy.title('você')}
        description={copy.description('você')}
        confirmLabel={copy.confirmLabel}
        change={{ subject: 'você', icon: User, from: copy.from(ownRow), to: copy.to }}
        isDestructive
        isDisabled={blockedReason !== null}
        onConfirm={() => props.onAction(target, 'leave')}
      />
    </section>
  )
}
