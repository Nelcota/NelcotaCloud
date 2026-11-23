import { ArrowRight, ArrowLeft } from 'lucide-react'
import type { JSX } from 'react'

import type { DraftErrors } from '@/modules/projects/components/draft-errors'
import {
  draftSlug,
  type DraftChange,
  type ProjectDraft,
} from '@/modules/projects/components/project-draft'
import { MoreOptions } from '@/modules/projects/components/more-options'
import { ProjectPreview } from '@/modules/projects/components/project-preview'
import { SlugField } from '@/modules/projects/components/slug-field'
import { StepPanel } from '@/modules/projects/components/step-panel'
import { Button } from '@/shared/ui/primitives/button'
import { SwitchField } from '@/shared/ui/switch-field'
import { TextField } from '@/shared/ui/text-field'
import { UrlField } from '@/shared/ui/url-field'

const MAX_NAME_LENGTH = 100

type ConfigStepProps = {
  draft: ProjectDraft
  onDraftChange: DraftChange
  /** Shown once the step was submitted; `null` before. */
  errors: DraftErrors | null
  isFocusedOnMount: boolean
  onBack: () => void
  onNext: () => void
}

/** The project's fields, with a preview beside them that follows every keystroke. */
export function ConfigStep(props: ConfigStepProps): JSX.Element {
  const { draft, onDraftChange, errors } = props

  return (
    <div className="@container">
      <div className="grid items-start gap-6 @min-[44rem]:grid-cols-[minmax(0,1fr)_16.25rem]">
        <StepPanel
          title="Como se chama o app?"
          isFocusedOnMount={props.isFocusedOnMount}
          onSubmit={props.onNext}
          footer={<ConfigFooter onBack={props.onBack} />}
        >
          <div className="grid gap-3">
            <TextField
              label="Nome do projeto"
              name="name"
              autoComplete="off"
              required
              placeholder="Meu app"
              maxLength={MAX_NAME_LENGTH}
              value={draft.name}
              error={errors?.name}
              onChange={(event) =>
                onDraftChange({ name: event.target.value.slice(0, MAX_NAME_LENGTH) })
              }
            />
            <SlugField
              slug={draftSlug(draft)}
              customSlug={draft.customSlug}
              error={errors?.slug}
              onCustomSlugChange={(customSlug) => onDraftChange({ customSlug })}
            />
          </div>
          <UrlField
            label="Site do app"
            isRequired
            placeholder="app.exemplo.com"
            hint="Os links de email e o login social voltam para cá."
            error={errors?.site}
            value={draft.siteUrl}
            onChange={(siteUrl) => onDraftChange({ siteUrl })}
          />
          <MoreOptions label="Mais opções">
            <SwitchField
              label="Exigir email confirmado"
              hint="Só quem confirmar o email poderá entrar com senha."
              checked={draft.requiresVerification}
              onCheckedChange={(requiresVerification) => onDraftChange({ requiresVerification })}
            />
          </MoreOptions>
        </StepPanel>
        <ProjectPreview draft={draft} />
      </div>
    </div>
  )
}

function ConfigFooter({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <>
      <Button type="submit">
        Continuar
        <ArrowRight aria-hidden data-icon="inline-end" />
      </Button>
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft aria-hidden data-icon="inline-start" />
        Voltar
      </Button>
    </>
  )
}
