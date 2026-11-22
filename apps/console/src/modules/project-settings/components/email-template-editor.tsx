import type { JSX } from 'react'

import { EmailTemplateForm } from '@/modules/project-settings/components/email-template-form'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/primitives/button'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type LoadState = { isPending: boolean; hasFailed: boolean; onRetry: () => void }

type EmailTemplateEditorProps = {
  projectId: string
  title: string
  appName: string
  /** `undefined` while loading, or when the API did not return this kind. */
  template: components['schemas']['EmailTemplateView'] | undefined
  state: LoadState
}

/** One email's form once its wording has loaded; the section shows a failed load. */
export function EmailTemplateEditor(props: EmailTemplateEditorProps): JSX.Element | null {
  const { template, state } = props

  if (state.hasFailed) {
    return null
  }

  if (state.isPending) {
    return <Skeleton className="h-96 rounded-xl" />
  }

  if (template === undefined) {
    return (
      <EmptyState
        isFramed
        isCompact
        title="Este modelo não está disponível."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={state.onRetry}>
            Recarregar modelos
          </Button>
        }
      />
    )
  }

  // Remounts with the saved wording after each save or reset, so the fields start from it.
  const version = `${template.kind}-${JSON.stringify(template.text)}`

  return (
    <EmailTemplateForm
      key={version}
      projectId={props.projectId}
      template={template}
      labels={{ title: props.title, appName: props.appName }}
    />
  )
}
