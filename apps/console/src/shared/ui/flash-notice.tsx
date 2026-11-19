import { useNavigate } from '@tanstack/react-router'
import CircleCheck from '~icons/solar/check-circle-linear'
import type { JSX } from 'react'

import { type Flash, useFlash } from '@/shared/lib/flash-notice'

/**
 * The latest "it worked" message, announced politely and gone after a few seconds. It floats at
 * the bottom of the page's panel, out of the page's flow: it is seen wherever the action was, never
 * pushes the page down when it comes and goes, and never covers the page's title.
 */
export function FlashNotice(): JSX.Element {
  const flash = useFlash()

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <FlashMessage flash={flash} />
    </div>
  )
}

function FlashMessage({ flash }: { flash: Flash | null }): JSX.Element | null {
  if (flash === null) {
    return null
  }

  return (
    <p className="bg-background pointer-events-auto flex max-w-lg flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-500/30 px-4 py-3 text-sm text-emerald-700 shadow-md dark:text-emerald-400">
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
