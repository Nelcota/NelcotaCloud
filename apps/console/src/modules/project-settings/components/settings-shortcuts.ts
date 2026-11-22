import Letter from '~icons/solar/letter-linear'
import Link from '~icons/solar/link-minimalistic-2-linear'
import Key from '~icons/solar/key-linear'
import Webhooks from '~icons/solar/share-linear'
import Team from '~icons/solar/users-group-rounded-linear'
import type { IconComponent } from '@/shared/ui/icon-component'

export type SettingsShortcut = {
  /** Path below `/projects/$projectId`. */
  segment: string
  label: string
  icon: IconComponent
}

/** Settings that have their own page, linked from the settings navigation. */
export const SETTINGS_SHORTCUTS: readonly SettingsShortcut[] = [
  { segment: 'email', label: 'Email', icon: Letter },
  { segment: 'providers', label: 'Login social', icon: Link },
  { segment: 'keys', label: 'Chaves de API', icon: Key },
  { segment: 'team', label: 'Equipe', icon: Team },
  { segment: 'webhooks', label: 'Webhooks', icon: Webhooks },
]
