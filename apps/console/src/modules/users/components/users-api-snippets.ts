import { hostOf } from '@/modules/users/components/api-host'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

const KEY_PLACEHOLDER = 'SUA_PUBLISHABLE_KEY'
const SECRET_HEADER = '-H "apikey: $NELCOTA_SECRET_KEY"'

/** Listing and reading users as an admin, and signing one up from the app. */
export function usersSnippets(publishableKey: string | null): ApiSnippet[] {
  return [
    {
      label: 'Listar',
      title: 'curl',
      code: [
        `curl "${API_BASE_URL}/auth/v1/admin/users?limit=50&offset=0" \\`,
        `  ${SECRET_HEADER}`,
        '',
        '# Filtros: &email=<parte do email> &status=unverified|banned',
      ].join('\n'),
    },
    {
      label: 'Ler um',
      title: 'curl',
      code: [`curl "${API_BASE_URL}/auth/v1/admin/users/$USER_ID" \\`, `  ${SECRET_HEADER}`].join(
        '\n',
      ),
    },
    {
      label: 'SDK',
      title: 'signup.ts',
      code: [
        "import { createClient } from '@nelcota/sdk'",
        '',
        'const nelcota = createClient({',
        `  url: '${API_BASE_URL}',`,
        `  publishableKey: '${publishableKey ?? KEY_PLACEHOLDER}',`,
        '})',
        '',
        'const signUp = await nelcota.auth.signUp({ email, password })',
      ].join('\n'),
    },
    {
      label: 'HTTP',
      title: 'http',
      code: [
        'GET /auth/v1/admin/users?limit=50&offset=0 HTTP/1.1',
        `Host: ${hostOf(API_BASE_URL)}`,
        'apikey: $NELCOTA_SECRET_KEY',
        'Accept: application/json',
      ].join('\n'),
    },
  ]
}
