import { snippetKeyOf } from '@/modules/project-settings/components/snippet-key'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

/** The SDK calls that send each auth email, and the same requests with curl. */
export function emailApiSnippets(publishableKey: string | null): ApiSnippet[] {
  const key = snippetKeyOf(publishableKey)

  return [
    { label: 'SDK', title: 'auth-emails.ts', code: sdkSnippet() },
    { label: 'curl', title: 'shell', code: curlSnippet(key) },
  ]
}

function sdkSnippet(): string {
  return [
    '// Verificação: enviada no cadastro quando o projeto exige email confirmado',
    'await nelcota.auth.signUp({ email, password })',
    '',
    '// Link mágico: entra (ou cadastra) quem abrir o link',
    'await nelcota.auth.sendMagicLink({ email })',
    '',
    '// Redefinição de senha: envia o link...',
    'await nelcota.auth.recoverPassword({ email })',
    '// ...e, na página do link, troca a senha com o token da URL',
    'await nelcota.auth.resetPassword({ token, password })',
  ].join('\n')
}

function curlSnippet(key: string): string {
  return [
    `curl -X POST ${API_BASE_URL}/auth/v1/magic-link \\`,
    `  -H "apikey: ${key}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '{"email":"ana@exemplo.com"}'`,
    '',
    `curl -X POST ${API_BASE_URL}/auth/v1/recover \\`,
    `  -H "apikey: ${key}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '{"email":"ana@exemplo.com"}'`,
  ].join('\n')
}
