import type { components } from '@/shared/api/api-schema'

/** What a project's mark is drawn from; mascot and logo are unknown while the project loads. */
export type ProjectMarkSource = {
  id: string
  name: string
  mascotId?: number
  /** The project's `logo_updated_at`. */
  logoVersion?: string | null
}

export function markSourceOf(project: components['schemas']['ProjectSummary']): ProjectMarkSource {
  return {
    id: project.id,
    name: project.name,
    mascotId: project.mascot_id,
    logoVersion: project.logo_updated_at,
  }
}
