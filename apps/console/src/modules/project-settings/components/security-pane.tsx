import type { JSX } from 'react'

import { CaptchaSection } from '@/modules/project-settings/components/captcha-section'
import { EndpointRow } from '@/modules/project-settings/components/endpoint-row'
import { RowLink } from '@/modules/project-settings/components/row-link'
import { SettingsGroup } from '@/modules/project-settings/components/settings-group'
import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import { API_BASE_URL } from '@/shared/api/api-base-url'

export function SecurityPane({ projectId }: { projectId: string }): JSX.Element {
  return (
    <>
      <CaptchaSection projectId={projectId} />
      <SettingsGroup title="Proteções" description="O que o app lê e quem já foi barrado.">
        <EndpointRow
          label="Site key para o app"
          meaning="O app lê a site key do widget aqui, com a chave publicável."
          value={`${API_BASE_URL}/auth/v1/captcha`}
        />
        <SettingsRow title="Endereços bloqueados" description="Gerenciados na atividade.">
          <RowLink href={`/projects/${projectId}/activity`} label="Gerenciar" />
        </SettingsRow>
      </SettingsGroup>
    </>
  )
}
