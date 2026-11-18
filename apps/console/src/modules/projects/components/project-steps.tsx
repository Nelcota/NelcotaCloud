import type { DraftChange, ProjectDraft } from '@/modules/projects/components/project-draft'
import { draftSlug } from '@/modules/projects/components/project-draft'
import {
  ProjectConnectionIllustration,
  ProjectIsolationIllustration,
  ProjectSiteIllustration,
} from '@/modules/projects/components/project-illustrations'
import { ProjectNameStep } from '@/modules/projects/components/project-name-step'
import { ProjectReviewStep } from '@/modules/projects/components/project-review-step'
import { ProjectSiteStep } from '@/modules/projects/components/project-site-step'
import { isValidSlug } from '@/modules/projects/components/project-slug'
import { isWebAddress } from '@/shared/lib/web-address'
import type { DialogStep } from '@/shared/ui/step-dialog/step-dialog'
import { missingUnless } from '@/shared/ui/step-dialog/missing-unless'

/** The new-project steps for what has been filled in so far. */
export function projectSteps(draft: ProjectDraft, onChange: DraftChange): DialogStep[] {
  return [
    {
      label: 'Nome',
      illustration: <ProjectIsolationIllustration />,
      content: <ProjectNameStep draft={draft} onChange={onChange} />,
      missing: missingUnless(
        draft.name.trim() !== '' && isValidSlug(draftSlug(draft)),
        'Dê um nome ao projeto',
      ),
    },
    {
      label: 'Site do app',
      illustration: <ProjectSiteIllustration />,
      content: <ProjectSiteStep draft={draft} onChange={onChange} />,
      missing: missingUnless(isWebAddress(draft.siteUrl), 'Digite o endereço do site do app'),
    },
    {
      label: 'Revisar',
      illustration: <ProjectConnectionIllustration />,
      content: <ProjectReviewStep draft={draft} />,
      missing: null,
    },
  ]
}
