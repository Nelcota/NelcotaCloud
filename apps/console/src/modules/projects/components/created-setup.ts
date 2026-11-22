import type { ProjectPurpose } from '@/modules/projects/components/project-draft'
import type { components } from '@/shared/api/api-schema'

/** The project the API just created, with what the flow knows about it. */
export type CreatedSetup = {
  project: components['schemas']['CreatedTenantResponse']
  purpose: ProjectPurpose
  name: string
}
