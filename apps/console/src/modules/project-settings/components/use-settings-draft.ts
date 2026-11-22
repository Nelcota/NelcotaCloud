import type { UseMutationResult } from '@tanstack/react-query'
import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react'

import {
  changedSettings,
  remainingDraft,
  type SettingsDraft,
} from '@/modules/project-settings/components/settings-draft'
import { useUpdateSettingsMutation } from '@/modules/project-settings/queries/use-project-settings'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

type SettingsDraftState = {
  draft: SettingsDraft
  setDraft: Dispatch<SetStateAction<SettingsDraft>>
  hasChanges: boolean
  update: UseMutationResult<Schemas['TenantSettings'], Error, Schemas['TenantSettingsBody']>
  submit: (event: FormEvent<HTMLFormElement>) => void
}

/** A local draft over the saved settings; unedited fields keep following the latest values. */
export function useSettingsDraft(
  projectId: string,
  settings: Schemas['TenantSettings'],
): SettingsDraftState {
  const update = useUpdateSettingsMutation(projectId)
  const [draft, setDraft] = useState<SettingsDraft>({})
  const patch = changedSettings(settings, draft)
  const hasChanges = Object.keys(patch).length > 0

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (hasChanges === false || update.isPending) {
      return
    }

    update.mutate(patch, {
      onSuccess: () => setDraft((current) => remainingDraft(current, draft, patch)),
    })
  }

  return { draft, setDraft, hasChanges, update, submit }
}
