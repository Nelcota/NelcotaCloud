import type { ProjectDraft } from '@/modules/projects/components/project-draft'

/** Where a new project starts: an app of the developer's own, or the repository's React example. */
export type ProjectStart = 'blank' | 'example'

/** The address `examples/react-auth` runs on (`npm run dev`). */
export const EXAMPLE_SITE_URL = 'http://localhost:5174'

/**
 * The draft after choosing a starting point: the example fills in its site, and going back to a
 * blank project clears it again. A site the user typed is never replaced.
 */
export function draftForStart(draft: ProjectDraft, start: ProjectStart): ProjectDraft {
  const siteUrl = draft.siteUrl.trim()

  if (start === 'example' && siteUrl === '') {
    return { ...draft, siteUrl: EXAMPLE_SITE_URL }
  }

  if (start === 'blank' && siteUrl === EXAMPLE_SITE_URL) {
    return { ...draft, siteUrl: '' }
  }

  return draft
}
