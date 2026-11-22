import type { components } from '@/shared/api/api-schema'
import { withHttps, withoutHttps } from '@/shared/lib/web-address'

type TenantSettings = components['schemas']['TenantSettings']

export type SettingsDraft = Partial<
  Pick<TenantSettings, 'name' | 'site_url' | 'require_email_verification'>
>

/** The fields whose edited value differs from the saved one, ready to send. */
export function changedSettings(settings: TenantSettings, draft: SettingsDraft): SettingsDraft {
  const patch: SettingsDraft = {}
  const name = draft.name?.trim()
  const address = draft.site_url
  const requiresVerification = draft.require_email_verification

  if (name !== undefined && name !== settings.name) {
    patch.name = name
  }

  if (address !== undefined && address !== withoutHttps(settings.site_url)) {
    patch.site_url = withHttps(address)
  }

  if (
    requiresVerification !== undefined &&
    requiresVerification !== settings.require_email_verification
  ) {
    patch.require_email_verification = requiresVerification
  }

  return patch
}

/** What is still being edited after a save: fields typed again while it was in flight. */
export function remainingDraft(
  current: SettingsDraft,
  submitted: SettingsDraft,
  patch: SettingsDraft,
): SettingsDraft {
  if (current === submitted) {
    return {}
  }

  const remaining = { ...current }

  for (const field of Object.keys(patch) as (keyof SettingsDraft)[]) {
    if (current[field] === submitted[field]) {
      delete remaining[field]
    }
  }

  return remaining
}
