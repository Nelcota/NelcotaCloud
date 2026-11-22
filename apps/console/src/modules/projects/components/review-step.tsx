import type { JSX } from 'react'

import { draftSlug, type ProjectDraft } from '@/modules/projects/components/project-draft'
import type { ProjectStart } from '@/modules/projects/components/project-start'
import { StepPanel } from '@/modules/projects/components/step-panel'
import { withHttps } from '@/shared/lib/web-address'
import { DataList, DataListItem } from '@/shared/ui/data-list'
import { InlineCode } from '@/shared/ui/inline-code'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'
import { FocusedError } from '@/shared/ui/step-dialog/focused-error'

const START_LABELS: Record<ProjectStart, string> = {
  blank: 'Projeto em branco',
  example: 'App de exemplo React',
}

type ReviewStepProps = {
  draft: ProjectDraft
  start: ProjectStart
  error: Error | null
  isFocusedOnMount: boolean
  onBack: () => void
  onCreate: () => void
}

/** Everything the project will be created with, and the one button that creates it. */
export function ReviewStep(props: ReviewStepProps): JSX.Element {
  const { draft, start } = props
  const slug = draftSlug(draft)

  return (
    <StepPanel
      title="Tudo certo?"
      description="O identificador não muda depois."
      isFocusedOnMount={props.isFocusedOnMount}
      onSubmit={props.onCreate}
      footer={
        <>
          <PendingButton type="submit" size="lg">
            Criar projeto
          </PendingButton>
          <Button type="button" variant="ghost" size="lg" onClick={props.onBack}>
            Voltar
          </Button>
        </>
      }
    >
      <DataList className="rounded-xl border bg-card px-5">
        <DataListItem label="Nome">{draft.name.trim()}</DataListItem>
        <DataListItem label="Identificador">
          <InlineCode>{slug}</InlineCode>
        </DataListItem>
        <DataListItem label="Site">{withHttps(draft.siteUrl)}</DataListItem>
        <DataListItem label="Email confirmado">
          <VerificationLabel isRequired={draft.requiresVerification} />
        </DataListItem>
        <DataListItem label="Ponto de partida">{START_LABELS[start]}</DataListItem>
      </DataList>
      <FocusedError error={props.error} />
    </StepPanel>
  )
}

function VerificationLabel({ isRequired }: { isRequired: boolean }): JSX.Element {
  if (isRequired) {
    return <>Exigido para entrar com senha</>
  }

  return <>Não exigido</>
}
