import type { AiContext } from '@/modules/overview/components/ai-context'
import { databaseSection } from '@/modules/overview/components/ai-database-section'

const KEY_PLACEHOLDER = 'SUA_PUBLISHABLE_KEY'

/** The project as Markdown for an AI coding agent: connection, login, tables and the rules. */
export function contextMarkdown(context: AiContext): string {
  return [
    `# ${context.projectName} no NelcotaCloud`,
    'Este app usa o NelcotaCloud (Auth e um banco Postgres servido como API REST sob row level security) pelo SDK `@nelcota/sdk`.',
    connectionSection(context),
    authSection(context),
    databaseSection(context.tables),
    RULES_SECTION,
  ]
    .filter((section) => section !== '')
    .join('\n\n')
}

function connectionSection(context: AiContext): string {
  const key = context.publishableKey ?? KEY_PLACEHOLDER

  return [
    '## Conexão',
    `- URL da API: \`${context.apiUrl}\``,
    `- Chave publishable (pública, pode ir no navegador): \`${key}\``,
    `- ID do projeto (para validar tokens no servidor): \`${context.projectId}\``,
    `- Site do app: ${context.siteUrl}`,
    '',
    '```bash',
    'npm install @nelcota/sdk',
    '```',
    '',
    '```ts',
    "import { createClient } from '@nelcota/sdk'",
    '',
    'export const nelcota = createClient({',
    `  url: '${context.apiUrl}',`,
    `  publishableKey: '${key}',`,
    '})',
    '```',
  ].join('\n')
}

function authSection(context: AiContext): string {
  return [
    '## Login',
    `- Métodos ativos: ${loginMethods(context.oauthProviders)}.`,
    verificationLine(context.requiresEmailVerification),
    captchaLine(context.hasCaptcha),
    '- Usuários com MFA recebem `mfaRequired` e `mfaToken` no login; conclua com `nelcota.auth.verifyMfa({ mfaToken, code })`.',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

function loginMethods(providers: string[]): string {
  const methods = [
    'email e senha (`nelcota.auth.signInWithPassword`)',
    'link mágico (`nelcota.auth.sendMagicLink`)',
  ]

  if (providers.length === 0) {
    return methods.join(', ')
  }

  const oauth = `${providers.join(', ')} (\`nelcota.auth.oauth.getAuthorizeUrl\`, com PKCE)`

  return [...methods, oauth].join(', ')
}

function verificationLine(requiresVerification: boolean): string {
  if (requiresVerification) {
    return '- Confirmação de email obrigatória: o login por senha só funciona depois que o usuário abre o link do email.'
  }

  return '- Confirmação de email desativada: o usuário entra logo após o cadastro.'
}

function captchaLine(hasCaptcha: boolean): string {
  if (hasCaptcha === false) {
    return ''
  }

  return '- CAPTCHA (Cloudflare Turnstile) obrigatório: leia a site key com `nelcota.auth.getCaptchaSiteKey()` e envie `captchaToken` no cadastro, no login por senha e nos links por email.'
}

const RULES_SECTION = [
  '## Regras',
  '- Use sempre o `@nelcota/sdk`; não chame a API com fetch à mão.',
  '- Nunca coloque a chave secreta (secret key) no navegador nem no repositório: ela ignora o RLS.',
  '- Quem lê e grava cada linha é decidido pelas políticas de RLS. Toda tabela nova em `public` nasce com RLS ligado e fechada até uma política abri-la; use `auth.uid()` para o usuário logado.',
  '- No seu servidor, valide o access token com `createAccessTokenVerifier` antes de confiar na requisição.',
].join('\n')
