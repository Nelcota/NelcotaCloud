import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'

export type ProviderGuide = {
  /** The page where the OAuth app is created, opened in a new tab. */
  consoleUrl: string
  consoleLabel: string
  /** What to do there, after opening it, in the provider's own words. */
  steps: string[]
}

export const PROVIDER_GUIDES: Record<OAuthProviderName, ProviderGuide> = {
  google: {
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    consoleLabel: 'Credenciais do Google Cloud',
    steps: [
      'Clique em “Criar credenciais” e escolha “ID do cliente OAuth”. Se o Google pedir, configure antes a tela de consentimento.',
      'Em “Tipo de aplicativo”, escolha “Aplicativo da Web”.',
      'Em “URIs de redirecionamento autorizados”, cole a URL de callback abaixo.',
      'Clique em “Criar” e copie o ID do cliente e a chave secreta.',
    ],
  },
  github: {
    consoleUrl: 'https://github.com/settings/applications/new',
    consoleLabel: 'New OAuth App do GitHub',
    steps: [
      'Dê um nome ao app e, em “Homepage URL”, coloque o endereço do seu site.',
      'Em “Authorization callback URL”, cole a URL de callback abaixo.',
      'Clique em “Register application” e copie o Client ID.',
      'Clique em “Generate a new client secret” e copie o secret.',
    ],
  },
}
