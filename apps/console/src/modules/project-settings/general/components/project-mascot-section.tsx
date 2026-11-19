import type { JSX, SubmitEvent } from 'react'
import { useState } from 'react'

import { ProjectMascotChoices } from '@/modules/project-settings/general/components/project-mascot-choices'
import { useUpdateSettingsMutation } from '@/modules/project-settings/general/queries/use-general-settings'
import { projectMascotSelection } from '@/modules/projects/model/project-mascots'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'

type ProjectMascotSectionProps = {
  projectId: string
  mascotId: number
}

export function ProjectMascotSection({
  projectId,
  mascotId,
}: ProjectMascotSectionProps): JSX.Element {
  const [draft, setDraft] = useState<number>()
  const update = useUpdateSettingsMutation(projectId)
  const saved = projectMascotSelection(mascotId)
  const selection = draft ?? saved

  function select(nextMascot: number): void {
    update.reset()
    setDraft(nextMascot)
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (selection === saved || update.isPending) {
      return
    }

    update.mutate({ mascot_id: selection }, { onSuccess: () => setDraft(undefined) })
  }

  return (
    <form onSubmit={submit}>
      <SettingsSection
        title="Mascote do projeto"
        footer={
          <>
            <SavedNote isSaved={update.isSuccess} message="Mascote salvo" />
            <Button
              type="submit"
              disabled={selection === saved || update.isPending}
              aria-busy={update.isPending}
            >
              Salvar mascote
            </Button>
          </>
        }
      >
        <ProjectMascotChoices
          projectId={projectId}
          selection={selection}
          disabled={update.isPending}
          onSelect={select}
        />
        <ErrorAlert error={update.error} />
      </SettingsSection>
    </form>
  )
}
