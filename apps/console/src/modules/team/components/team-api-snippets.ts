import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { ApiSnippet } from '@/shared/ui/api-sheet'

/** The team endpoints, called with a console account's access token (not an API key). */
export function teamApiSnippets(projectId: string): ApiSnippet[] {
  const base = `${API_BASE_URL}/platform/v1/projects/${projectId}`

  return [
    { label: 'Ler', title: 'curl', code: readSnippet(base) },
    { label: 'Gerenciar', title: 'curl', code: manageSnippet(base) },
  ]
}

function readSnippet(base: string): string {
  return [
    '# Membros, convites pendentes e se você pode gerenciar (can_manage)',
    `curl "${base}/team" \\`,
    '  -H "Authorization: Bearer $CONSOLE_ACCESS_TOKEN"',
  ].join('\n')
}

function manageSnippet(base: string): string {
  const auth = '  -H "Authorization: Bearer $CONSOLE_ACCESS_TOKEN"'
  const json = '  -H "content-type: application/json" \\'

  return [
    '# Convidar (entra como membro)',
    `curl -X POST "${base}/invitations" \\`,
    `${auth} \\`,
    json,
    '  -d \'{"email":"pessoa@empresa.com"}\'',
    '',
    '# Reenviar ou cancelar um convite',
    `curl -X POST "${base}/invitations/$INVITATION_ID/resend" \\`,
    auth,
    `curl -X DELETE "${base}/invitations/$INVITATION_ID" \\`,
    auth,
    '',
    '# Mudar papel: "owner" ou "member"',
    `curl -X PATCH "${base}/members/$ACCOUNT_ID" \\`,
    `${auth} \\`,
    json,
    '  -d \'{"role":"owner"}\'',
    '',
    '# Transferir o projeto (você vira membro)',
    `curl -X POST "${base}/ownership-transfer" \\`,
    `${auth} \\`,
    json,
    '  -d \'{"account_id":"\'"$ACCOUNT_ID"\'"}\'',
    '',
    '# Remover alguém, ou sair você mesmo',
    `curl -X DELETE "${base}/members/$ACCOUNT_ID" \\`,
    auth,
    `curl -X DELETE "${base}/membership" \\`,
    auth,
  ].join('\n')
}
