import type { JSX } from 'react'

type ProjectStateProps = { slug: string | undefined }

/**
 * Under the project's name: its slug as a mono pill (like a service's branch). The verdict is
 * the sentence under the header, said once.
 */
export function ProjectState({ slug }: ProjectStateProps): JSX.Element {
  return (
    <span className="flex flex-wrap items-center gap-2 pt-1">
      <SlugPill slug={slug} />
    </span>
  )
}

function SlugPill({ slug }: { slug: string | undefined }): JSX.Element | null {
  if (slug === undefined) {
    return null
  }

  return (
    <span className="inline-flex h-6 items-center rounded-sm bg-surface-hover px-2 font-mono text-xs text-foreground">
      {slug}
    </span>
  )
}
