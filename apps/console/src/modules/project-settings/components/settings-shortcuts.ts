import {
  Mail as Letter,
  Link2 as Link,
  KeyRound as Key,
  Share2 as Webhooks,
  Users as Team,
} from 'lucide-react'
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
