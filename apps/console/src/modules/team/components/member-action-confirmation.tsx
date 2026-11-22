import { User } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import type { ActionTarget } from '@/modules/team/components/action-target'
import { ACTION_COPY, titleFor } from '@/modules/team/components/team-action-copy'
import type { MemberAction } from '@/modules/team/components/team-row-actions'
import type { ConfirmChange } from '@/shared/ui/confirm-change'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { CheckboxField } from '@/shared/ui/switch-field'

type MemberActionConfirmationProps = {
  action: MemberAction | null
  target: ActionTarget
  onClose: () => void
  onConfirm: (target: ActionTarget, action: MemberAction) => Promise<void>
}

/**
 * Confirms one member action. "Tornar dono" offers "e deixar de ser dono": ticked, it becomes
 * a handover, whose title and description then say what you give up, shows both changes
 * (theirs and yours) and confirms with a neutral button.
 */
export function MemberActionConfirmation(props: MemberActionConfirmationProps): JSX.Element | null {
  const [isSteppingDown, setIsSteppingDown] = useState(false)

  if (props.action === null) {
    return null
  }

  const action = effectiveAction(props.action, isSteppingDown)
  const copy = ACTION_COPY[action]
  const { target } = props

  return (
    <ConfirmDialog
      isOpen
      onClose={props.onClose}
      title={titleFor(action, target.name, target.isOwnRow)}
      description={copy.description(target.name)}
      confirmLabel={copy.confirmLabel}
      isDestructive={copy.isDestructive}
      isWeighty={copy.isWeighty}
      change={changesFor(action, target)}
      onConfirm={() => props.onConfirm(target, action)}
    >
      <StepDownChoice
        isShown={props.action === 'promote'}
        isChecked={isSteppingDown}
        onChange={setIsSteppingDown}
      />
    </ConfirmDialog>
  )
}

type StepDownChoiceProps = {
  isShown: boolean
  isChecked: boolean
  onChange: (isChecked: boolean) => void
}

function StepDownChoice({ isShown, isChecked, onChange }: StepDownChoiceProps): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return (
    <CheckboxField
      label="E deixar de ser dono (transferir o projeto)"
      checked={isChecked}
      onCheckedChange={onChange}
    />
  )
}

function effectiveAction(action: MemberAction, isSteppingDown: boolean): MemberAction {
  if (action === 'promote' && isSteppingDown) {
    return 'transfer'
  }

  return action
}

/** A handover changes two people; every other action changes one. */
function changesFor(action: MemberAction, target: ActionTarget): ConfirmChange[] {
  const copy = ACTION_COPY[action]
  const theirs: ConfirmChange = {
    subject: target.name,
    icon: User,
    from: copy.from(target.row),
    to: copy.to,
  }

  if (action !== 'transfer') {
    return [theirs]
  }

  return [theirs, { subject: 'você', icon: User, from: 'Dono', to: 'Membro' }]
}
