import { hostOf } from '@/modules/users/components/api-host'
import type { components } from '@/shared/api/api-schema'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

type User = components['schemas']['User']

const SECRET_HEADER = '-H "apikey: $NELCOTA_SECRET_KEY"'

/** Reading and changing this user, with its real id and current metadata. */
export function userSnippets(user: User): ApiSnippet[] {
  const userUrl = `${API_BASE_URL}/auth/v1/admin/users/${user.id}`
  const appMetadata = JSON.stringify({ app_metadata: user.app_metadata })

  return [
    {
      label: 'Ler',
      title: 'curl',
      code: [`curl "${userUrl}" \\`, `  ${SECRET_HEADER}`].join('\n'),
    },
    {
      label: 'Metadados',
      title: 'curl',
      code: [
        `curl -X PATCH "${userUrl}" \\`,
        `  ${SECRET_HEADER} \\`,
        '  -H "Content-Type: application/json" \\',
        `  -d '${appMetadata.replaceAll("'", "'\\''")}'`,
        '',
        '# app_metadata vai no token de acesso a partir da próxima renovação.',
      ].join('\n'),
    },
    {
      label: 'SDK',
      title: 'profile.ts',
      code: [
        '// No app, com o usuário logado: troca o próprio user_metadata.',
        `await nelcota.auth.updateUser(${JSON.stringify(user.user_metadata, null, 2)})`,
      ].join('\n'),
    },
    {
      label: 'HTTP',
      title: 'http',
      code: [
        `GET /auth/v1/admin/users/${user.id} HTTP/1.1`,
        `Host: ${hostOf(API_BASE_URL)}`,
        'apikey: $NELCOTA_SECRET_KEY',
        'Accept: application/json',
      ].join('\n'),
    },
  ]
}
