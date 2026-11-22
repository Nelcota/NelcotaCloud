import type { JSX } from 'react'

import { CaptchaForm } from '@/modules/project-settings/components/captcha-form'
import { useCaptchaQuery } from '@/modules/project-settings/queries/use-captcha'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

/** Cloudflare Turnstile on signup, password login and emailed links. */
export function CaptchaSection({ projectId }: { projectId: string }): JSX.Element {
  const captcha = useCaptchaQuery(projectId)

  if (captcha.data === undefined) {
    return <CaptchaLoading error={captcha.error} onRetry={() => captcha.refetch()} />
  }

  const siteKey = captcha.data.site_key ?? null

  return <CaptchaForm key={siteKey ?? 'off'} projectId={projectId} siteKey={siteKey} />
}

type CaptchaLoadingProps = { error: Error | null; onRetry: () => void }

function CaptchaLoading({ error, onRetry }: CaptchaLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return <Skeleton className="h-64 rounded-xl" />
}
