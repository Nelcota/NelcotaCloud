import { User } from 'lucide-react'
import type { JSX } from 'react'

import type { ActionTarget } from '@/modules/team/components/action-target'
import { ACTION_COPY } from '@/modules/team/components/team-action-copy'
import { type MemberAction, leaveBlockedReason } from '@/modules/team/components/team-row-actions'
import { type MemberRow, ownerCount } from '@/modules/team/components/team-rows'
import type { components } from '@/shared/api/api-schema'
import { ReadOnlyContext } from '@/shared/auth/write-access'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { SettingsSection } from '@/shared/ui/settings-section'

type TeamView = components['schemas']['TeamView']

type LeaveProjectSectionProps = {
  team: TeamView
  /** The own membership of the viewer; `null` while the list does not include it yet. */
  ownRow: MemberRow | null
  onAction: (target: ActionTarget, action: MemberAction) => Promise<void>
}

/** Leaving, in a danger panel at the end of the page; the project always keeps an owner. */
export function LeaveProjectSection(props: LeaveProjectSectionProps): JSX.Element | null {
  const { team, ownRow } = props

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
    <SettingsSection
      title="Sair do projeto"
      description={blockedReason ?? 'Você perde o acesso na hora e só volta com um novo convite.'}
      isDanger
      footer={
        // Leaving goes through the account, not the project: viewers may leave too.
        <ReadOnlyContext value={false}>
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
        </ReadOnlyContext>
      }
    />
  )
}
