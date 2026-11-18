import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'

export const PROVIDER_NAMES: Record<OAuthProviderName, string> = {
  google: 'Google',
  github: 'GitHub',
}
