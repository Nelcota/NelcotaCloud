import type { JSX, ReactNode } from 'react'

import { ILLUSTRATION_ART } from '@/shared/ui/illustration/illustration-art'

type IllustrationProps = {
  /** The art's name in `ILLUSTRATION_ART`, e.g. `webhook-flow`. */
  name: string
  /** What the picture shows: read by screen readers, and printed under it in a step preview. */
  description: string
  /** Shown until drawn art exists for `name`: a `FlowDiagram` of the same story. */
  children: ReactNode
}

/**
 * What is about to happen, as a picture: the drawn art when there is one, the diagram until then.
 * It is a size container, so the diagram lays itself out for the room it gets.
 */
export function Illustration({ name, description, children }: IllustrationProps): JSX.Element {
  const art = ILLUSTRATION_ART[name]

  return (
    <figure className="bg-muted/40 @container grid gap-4 overflow-hidden rounded-lg px-4 py-5">
      <Picture art={art}>{children}</Picture>
      <figcaption className="in-data-[slot=step-preview]:text-muted-foreground sr-only in-data-[slot=step-preview]:not-sr-only in-data-[slot=step-preview]:text-center in-data-[slot=step-preview]:text-sm in-data-[slot=step-preview]:text-pretty">
        {description}
      </figcaption>
    </figure>
  )
}

/** The caption carries the meaning, so the picture itself is hidden from screen readers. */
function Picture({ art, children }: { art: string | undefined; children: ReactNode }): JSX.Element {
  if (art === undefined) {
    return <div aria-hidden="true">{children}</div>
  }

  return <img src={art} alt="" className="mx-auto max-h-48 w-full object-contain" />
}
