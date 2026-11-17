import { useNavigate } from '@tanstack/react-router'
import CircleCheck from '~icons/solar/check-circle-linear'
import type { JSX } from 'react'

import { type Flash, useFlash } from '@/shared/lib/flash-notice'

/**
 * The latest "it worked" message, announced politely and gone after a few seconds. It sticks
 * under the top bar, so it is seen even when the action was far down the page.
 */
export function FlashNotice(): JSX.Element {
  const flash = useFlash()

  return (
    <div role="status" aria-live="polite" className="sticky top-16 z-10">
      <FlashMessage flash={flash} />
    </div>
  )
}

function FlashMessage({ flash }: { flash: Flash | null }): JSX.Element | null {
  if (flash === null) {
    return null
  }

  return (
    <p className="bg-background mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-emerald-500/30 px-4 py-3 text-sm text-emerald-700 shadow-md dark:text-emerald-400">
      <span className="flex items-center gap-2">
        <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
        {flash.message}
      </span>
      <FlashLink link={flash.link} />
    </p>
  )
}

function FlashLink({ link }: { link: Flash['link'] }): JSX.Element | null {
  const navigate = useNavigate()

  if (link === undefined) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => navigate({ href: link.href })}
      className="text-foreground font-medium underline underline-offset-3"
    >
      {link.label}
    </button>
  )
}
