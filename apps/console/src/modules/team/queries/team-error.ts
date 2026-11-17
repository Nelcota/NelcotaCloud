import { ApiError } from '@/shared/api/api-error'

/** The API speaks English; the rules people hit on this page get a sentence in Portuguese. */
const MESSAGES: Record<string, string> = {
  last_owner: 'O projeto precisa de pelo menos um dono. Transfira a propriedade antes.',
  owned_project_limit: 'Essa pessoa já é dona do máximo de 10 projetos.',
  already_member: 'Essa pessoa já faz parte da equipe.',
  already_invited: 'Já existe um convite pendente para esse email.',
  too_many_requests: 'Muitos convites em pouco tempo. Espere um minuto e tente de novo.',
  not_found: 'Essa pessoa ou convite não existe mais. Recarregue a página.',
  project_access_denied: 'Você não tem mais acesso a este projeto.',
}

export function explainTeamError(error: unknown): never {
  if (error instanceof ApiError) {
    throw new ApiError({
      status: error.status,
      code: error.code,
      message: MESSAGES[error.code] ?? error.message,
    })
  }

  throw error
}
