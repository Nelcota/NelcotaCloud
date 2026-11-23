import type { JSX } from 'react'

import { AvatarUploadDialog } from '@/modules/account/components/avatar-upload-dialog'
import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import {
  useRemoveLogoMutation,
  useUploadLogoMutation,
} from '@/modules/project-settings/queries/use-project-logo-mutations'
import { ProjectMark } from '@/modules/projects/components/project-mark'
import type { components } from '@/shared/api/api-schema'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type ProjectLogoRowProps = {
  projectId: string
  settings: components['schemas']['TenantSettings']
}

const LOGO_COPY = {
  title: 'Logo do projeto',
  description: 'Arraste para enquadrar a imagem.',
  saveLabel: 'Salvar logo',
}

/** The logo is saved as soon as it is cropped, apart from the panel's Save button. */
export function ProjectLogoRow({ projectId, settings }: ProjectLogoRowProps): JSX.Element {
  const upload = useUploadLogoMutation(projectId)
  const removal = useRemoveLogoMutation(projectId)
  const version = settings.logo_updated_at ?? null

  return (
    <SettingsRow title="Logo" description="Aparece no console no lugar das iniciais.">
      <ProjectMark
        project={{
          id: projectId,
          name: settings.name,
          mascotId: settings.mascot_id,
          logoVersion: version,
        }}
        size="lg"
      />
      <RemoveLogoButton
        hasLogo={version !== null}
        isPending={removal.isPending}
        onConfirm={() => removal.mutateAsync()}
      />
      <AvatarUploadDialog
        copy={{ ...LOGO_COPY, triggerLabel: uploadLabel(version) }}
        cropShape="rect"
        upload={upload}
      />
    </SettingsRow>
  )
}

type RemoveLogoButtonProps = {
  hasLogo: boolean
  isPending: boolean
  onConfirm: () => Promise<void>
}

function RemoveLogoButton(props: RemoveLogoButtonProps): JSX.Element | null {
  if (props.hasLogo === false) {
    return null
  }

  return (
    <ConfirmButton
      label="Remover"
      title="Remover o logo?"
      description="O projeto volta a aparecer com o mascote ou as iniciais."
      confirmLabel="Remover logo"
      isDestructive
      isPending={props.isPending}
      onConfirm={props.onConfirm}
    />
  )
}

function uploadLabel(version: string | null): string {
  if (version === null) {
    return 'Enviar logo'
  }

  return 'Trocar logo'
}
