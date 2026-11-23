import Plain from '~icons/solar/plain-linear'
import type { JSX } from 'react'

import { useTestChannelMutation } from '@/modules/notifications/queries/use-notification-channels'
import { describeError } from '@/shared/api/describe-error'
import { useReadOnlyReason } from '@/shared/auth/write-access'
import { Button } from '@/shared/ui/button'

type TestChannelButtonProps = { projectId: string; channelId: string }

/** Sends a test alert now and says, next to the button, whether it went through. */
export function TestChannelButton({ projectId, channelId }: TestChannelButtonProps): JSX.Element {
  const test = useTestChannelMutation(projectId)
  const readOnlyReason = useReadOnlyReason()

  return (
    <span className="inline-flex items-center gap-2">
      <TestResult isSuccess={test.isSuccess} error={test.error} />
      <Button
        size="sm"
        variant="ghost"
        disabled={test.isPending || readOnlyReason !== null}
        title={readOnlyReason ?? undefined}
        aria-busy={test.isPending}
        onClick={() => test.mutate(channelId)}
      >
        <Plain aria-hidden="true" />
        Testar
      </Button>
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
    return <span className="text-emerald-700 dark:text-emerald-400">Enviado.</span>
  }

  return null
}
