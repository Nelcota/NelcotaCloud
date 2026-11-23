import { Send } from 'lucide-react'
import type { JSX } from 'react'

import { useTestChannelMutation } from '@/modules/notifications/queries/use-notification-channels'
import { describeError } from '@/shared/api/describe-error'
import { PendingButton } from '@/shared/ui/pending-button'

type TestChannelButtonProps = { projectId: string; channelId: string }

/** Sends a test alert now and says, next to the button, whether it went through. */
export function TestChannelButton({ projectId, channelId }: TestChannelButtonProps): JSX.Element {
  const test = useTestChannelMutation(projectId)

  return (
    <span className="inline-flex items-center gap-2">
      <TestResult isSuccess={test.isSuccess} error={test.error} />
      <PendingButton
        type="button"
        variant="ghost"
        size="sm"
        isPending={test.isPending}
        onClick={() => test.mutate(channelId)}
      >
        <Send aria-hidden data-icon="inline-start" />
        Testar
      </PendingButton>
    </span>
  )
}

type TestResultProps = { isSuccess: boolean; error: Error | null }

/** Always mounted, so screen readers hear the result when its text arrives. */
function TestResult({ isSuccess, error }: TestResultProps): JSX.Element {
  return (
    <span role="status" className="text-xs empty:hidden">
      <TestResultText isSuccess={isSuccess} error={error} />
    </span>
  )
}

function TestResultText({ isSuccess, error }: TestResultProps): JSX.Element | null {
  if (error !== null) {
    return <span className="text-destructive">{describeError(error)}</span>
  }

  if (isSuccess) {
    return <span className="text-success">Enviado.</span>
  }

  return null
}
