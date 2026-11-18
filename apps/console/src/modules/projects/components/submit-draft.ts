import { draftSlug, type ProjectDraft } from '@/modules/projects/components/project-draft'
import type { components } from '@/shared/api/api-schema'
import { withHttps } from '@/shared/lib/web-address'

type CreateTenantBody = components['schemas']['CreateTenantBody']

/** The API body for the draft: trimmed name, final slug and the site with its `https://`. */
export function submitDraft(draft: ProjectDraft): CreateTenantBody {
  return {
    name: draft.name.trim(),
    slug: draftSlug(draft),
    site_url: withHttps(draft.siteUrl),
    require_email_verification: draft.requiresVerification,
  }
}
