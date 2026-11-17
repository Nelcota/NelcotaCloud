import ExternalLink from '~icons/solar/square-arrow-right-up-linear'
import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/skeleton'

/** The app this project serves; opens in a new tab, since the console stays where it is. */
export function SiteUrl({ url }: { url: string | undefined }): JSX.Element {
  if (url === undefined) {
    return <Skeleton className="h-4 w-48" />
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="hover:text-foreground inline-flex items-center gap-1 underline-offset-4 transition-colors hover:underline"
    >
      {url}
      <ExternalLink className="size-4" />
    </a>
  )
}
