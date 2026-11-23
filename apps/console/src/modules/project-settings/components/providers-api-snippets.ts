import { snippetKeyOf } from '@/modules/project-settings/components/snippet-key'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

/** Social login from the app: open the provider, then trade the one-time code with PKCE. */
export function providersApiSnippets(publishableKey: string | null): ApiSnippet[] {
  const key = snippetKeyOf(publishableKey)

  return [
    { label: 'SDK', title: 'login-social.ts', code: sdkSnippet() },
    { label: 'HTTP', title: 'http', code: httpSnippet(key) },
  ]
}

function sdkSnippet(): string {
  return [
    '// 1. Botão "Entrar com Google": o SDK guarda o verificador PKCE',
    'const url = await nelcota.auth.oauth.getAuthorizeUrl({',
    "  provider: 'google', // ou 'github'",
    "  redirectTo: 'https://seuapp.com/auth/callback',",
    '})',
    'window.location.assign(url)',
    '',
    '// 2. Em /auth/callback: troca o code de uso único pela sessão',
    'const result = await nelcota.auth.oauth.exchangeCode(window.location.href)',
    '',
    "if (result.kind === 'mfa_required') {",
    '  // peça o código TOTP e chame nelcota.auth.verifyMfa(...)',
    '}',
  ].join('\n')
}

function httpSnippet(key: string): string {
  return [
    '# 1. O navegador abre (redirect_to precisa estar nas URLs de retorno do app)',
    `GET ${API_BASE_URL}/auth/v1/oauth/{google|github}/authorize`,
    `    ?apikey=${key}`,
    '    &redirect_to=https%3A%2F%2Fseuapp.com%2Fauth%2Fcallback',
    '    &code_challenge=<BASE64URL(SHA256(verifier))>',
    '    &code_challenge_method=S256',
    '',
    '# 2. O app volta com ?code=...; troque-o com o verificador',
    `POST ${API_BASE_URL}/auth/v1/oauth/token`,
    `apikey: ${key}`,
    'Content-Type: application/json',
    '',
    '{ "code": "<code>", "code_verifier": "<verifier>" }',
  ].join('\n')
}
