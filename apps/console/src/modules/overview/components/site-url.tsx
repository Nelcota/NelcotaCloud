import { ArrowUpRight } from 'lucide-react'
import type { JSX } from 'react'

/** The app this project serves, as a chip of the facts bar; opens in a new tab. */
export function SiteUrl({ url }: { url: string | undefined }): JSX.Element | null {
  if (url === undefined) {
    return null
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-md bg-surface px-2 text-2xs hover:bg-surface-hover hover:text-foreground"
    >
      <span className="shrink-0 text-muted-foreground">Site</span>
      <span className="min-w-0 truncate font-mono">{url}</span>
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  )
}
