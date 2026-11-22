import { JWKS_URL, PUBLISHABLE_PLACEHOLDER } from '@/modules/api-keys/components/project-endpoints'
import { API_BASE_URL } from '@/shared/api/api-base-url'

export type ConnectStep = {
  id: string
  label: string
  /** The short name of the step's tab ("Cliente"). */
  tab: string
  code: string
}

/** The code of each connect step, filled with the project's key when the console can show it. */
export function connectSteps(publishableKey: string | null, projectId: string): ConnectStep[] {
  const key = publishableKey ?? PUBLISHABLE_PLACEHOLDER

  return [
    { id: 'install', label: 'Terminal', tab: 'Instalar', code: 'npm install @nelcota/sdk' },
    { id: 'client', label: 'src/nelcota.ts', tab: 'Cliente', code: clientSnippet(key) },
    {
      id: 'verifier',
      label: 'server/auth.ts',
      tab: 'Servidor',
      code: verifierSnippet(projectId),
    },
    { id: 'env', label: '.env', tab: '.env', code: envSnippet(key, projectId) },
  ]
}

function clientSnippet(key: string): string {
  return [
    "import { createClient } from '@nelcota/sdk'",
    '',
    'export const nelcota = createClient({',
    `  url: '${API_BASE_URL}',`,
    `  publishableKey: '${key}',`,
    '})',
    '',
    'await nelcota.auth.signInWithPassword({ email, password })',
  ].join('\n')
}

function verifierSnippet(projectId: string): string {
  return [
    "import { createAccessTokenVerifier } from '@nelcota/sdk'",
    '',
    `// Busca e guarda em cache o JWKS: ${JWKS_URL}`,
    'const verifyAccessToken = createAccessTokenVerifier({',
    '  url: process.env.NELCOTA_URL,',
    '  publishableKey: process.env.NELCOTA_PUBLISHABLE_KEY,',
    `  projectId: '${projectId}',`,
    '})',
    '',
    '// { sub, email, sid, app_metadata } ou AccessTokenVerificationError',
    "const claims = await verifyAccessToken(request.headers.authorization.replace('Bearer ', ''))",
  ].join('\n')
}

function envSnippet(key: string, projectId: string): string {
  return [
    `NELCOTA_URL=${API_BASE_URL}`,
    `NELCOTA_PROJECT_ID=${projectId}`,
    `NELCOTA_PUBLISHABLE_KEY=${key}`,
    '# Só no servidor, nunca no app nem no repositório',
    'NELCOTA_SECRET_KEY=',
  ].join('\n')
}
