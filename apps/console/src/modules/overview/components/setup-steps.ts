/** What the project has set up so far, read from live data. */
export type SetupFacts = {
  publishableKeys: number
  siteUrl: string
  providers: number
  hasOwnSmtp: boolean
  users: number
}

export type SetupStep = {
  id: string
  label: string
  detail: string
  isDone: boolean
  to: string
  actionLabel: string
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** The steps from a new project to an app in production, in the order a team usually takes. */
export function setupSteps(facts: SetupFacts, projectId: string): SetupStep[] {
  const base = `/projects/${projectId}`

  return [
    {
      id: 'key',
      label: 'Crie uma chave publicável',
      detail: 'É com ela que o app fala com a API.',
      isDone: facts.publishableKeys > 0,
      to: `${base}/keys`,
      actionLabel: 'Criar chave',
    },
    {
      id: 'site',
      label: 'Aponte o site para produção',
      detail: 'Os links dos emails e o login social voltam para ele.',
      isDone: isPublicSite(facts.siteUrl),
      to: `${base}/settings`,
      actionLabel: 'Definir site',
    },
    {
      id: 'social',
      label: 'Ative o login social',
      detail: 'Google ou GitHub, com o app OAuth do projeto.',
      isDone: facts.providers > 0,
      to: `${base}/providers`,
      actionLabel: 'Configurar',
    },
    {
      id: 'smtp',
      label: 'Envie emails pelo seu domínio',
      detail: 'Conecte o servidor SMTP do projeto.',
      isDone: facts.hasOwnSmtp,
      to: `${base}/email`,
      actionLabel: 'Conectar SMTP',
    },
    {
      id: 'user',
      label: 'Receba o primeiro cadastro',
      detail: 'Conecte o app com o SDK ou peça ao seu agente de IA.',
      isDone: facts.users > 0,
      to: `${base}/users`,
      actionLabel: 'Ver usuários',
    },
  ]
}

/** A site on the developer's own machine still counts as not in production. */
export function isPublicSite(siteUrl: string): boolean {
  const hostname = hostnameOf(siteUrl)

  if (hostname === null) {
    return false
  }

  return LOCAL_HOSTS.has(hostname) === false && hostname.endsWith('.localhost') === false
}

function hostnameOf(siteUrl: string): string | null {
  try {
    return new URL(siteUrl).hostname
  } catch {
    return null
  }
}
