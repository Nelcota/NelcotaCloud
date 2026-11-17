/**
 * The API speaks English. These are the sentences people read instead, in Portuguese, keyed
 * first by the stable error code.
 */
export const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: 'Email ou senha incorretos.',
  email_taken: 'Já existe uma conta com esse email.',
  email_not_verified: 'Confirme seu email antes de entrar. O link está na sua caixa de entrada.',
  invalid_token: 'Este link expirou ou já foi usado. Peça um novo.',
  invalid_mfa_code: 'Código incorreto. Confira o app autenticador e tente de novo.',
  invalid_refresh_token: 'Sua sessão terminou. Entre de novo.',
  invalid_access_token: 'Sua sessão terminou. Entre de novo.',
  user_banned: 'Esta conta está bloqueada.',
  email_already_verified: 'Este email já foi confirmado.',
  too_many_requests: 'Muitas tentativas em pouco tempo. Espere um minuto e tente de novo.',
  slug_taken: 'Esse identificador já está em uso. Escolha outro.',
  project_access_denied: 'Você não tem mais acesso a este projeto.',
  admin_access_denied: 'Você não tem permissão para isso neste projeto.',
  secret_key_required: 'Essa ação exige uma secret key.',
  smtp_delivery_failed:
    'O servidor SMTP não aceitou o email. Confira host, porta, usuário e senha.',
  provider_not_configured: 'Esse login social não está configurado neste projeto.',
  unknown_provider: 'Esse provedor de login não existe.',
  invalid_oauth_code: 'O login social expirou. Comece de novo.',
  webhook_endpoint_limit: 'O projeto já tem 5 endpoints, o máximo. Exclua um antes de criar outro.',
  last_owner: 'O projeto precisa de pelo menos um dono. Transfira a propriedade antes.',
  owned_project_limit: 'Essa conta já é dona do máximo de 10 projetos.',
  already_member: 'Essa pessoa já faz parte da equipe.',
  already_invited: 'Já existe um convite pendente para esse email.',
  payload_too_large: 'O arquivo é grande demais.',
  platform_not_configured: 'O console ainda não foi configurado neste servidor.',
  internal_error: 'Erro no servidor. Tente de novo em instantes.',
  query_timeout: 'A consulta passou de 15 segundos e foi cancelada.',
  table_not_found: 'Essa tabela não existe mais. Recarregue a página.',
  permission_denied: 'Os privilégios ou as políticas da tabela recusaram o acesso.',
}

/** Generic codes carry the detail in their English message; the known ones read like this. */
export const MESSAGES_BY_TEXT: Record<string, string> = {
  'the last active secret key cannot be revoked; create another one first':
    'Esta é a última secret key ativa. Crie outra antes de revogar esta.',
  'TOTP is already enabled; disable it before adding another authenticator':
    'A verificação em duas etapas já está ativa. Desative-a antes de trocar de app.',
  'configure your own SMTP server before sending a test':
    'Configure o seu servidor SMTP antes de enviar um teste.',
  'the delivery is being sent right now':
    'Essa entrega está sendo enviada agora. Espere o resultado.',
  'site URL must be an absolute http(s) URL without credentials':
    'A URL do site precisa começar com http:// ou https:// e não pode ter usuário ou senha.',
  'invalid email address': 'Email inválido.',
  'choose at least one event type': 'Escolha pelo menos um evento.',
  'client_id and client_secret must not be blank': 'Preencha o Client ID e o Client secret.',
  'the image could not be read': 'Não foi possível ler a imagem.',
  'the image is empty': 'A imagem está vazia.',
  'the image must be PNG, JPEG or WebP': 'A imagem precisa ser PNG, JPEG ou WebP.',
  'the image must be at most 1 MiB': 'A imagem precisa ter no máximo 1 MiB.',
  'the webhook URL is longer than 2048 characters': 'A URL do webhook passa de 2048 caracteres.',
  'the webhook URL is not a valid absolute URL': 'A URL do webhook não é válida.',
  'the webhook URL must not carry a user name or password':
    'A URL do webhook não pode ter usuário ou senha.',
  'the webhook URL must point to a public host':
    'A URL do webhook precisa apontar para um endereço público.',
  'the webhook URL must use https': 'A URL do webhook precisa usar https://.',
  'webhook host resolves to no public address':
    'O domínio do webhook não aponta para nenhum endereço público.',
  'too many manual webhook sends': 'Muitos envios manuais em pouco tempo. Espere um minuto.',
  'SMTP URL is not a valid URL': 'A SMTP URL não é válida.',
  'SMTP URL is not valid': 'A SMTP URL não é válida.',
  'SMTP URL must name a host': 'A SMTP URL precisa ter um host.',
  'SMTP URL must start with smtp:// or smtps://':
    'A SMTP URL precisa começar com smtp:// ou smtps://.',
  'SMTP connections must use implicit TLS or required STARTTLS':
    'Use TLS: smtps:// ou smtp://…?tls=required.',
  'SMTP requires implicit TLS (smtps://) or required STARTTLS (?tls=required)':
    'Use TLS: smtps:// ou smtp://…?tls=required.',
  'SMTP host could not be resolved': 'O host SMTP não foi encontrado.',
  'SMTP host must be a public host name or address': 'O host SMTP precisa ser um endereço público.',
  'SMTP server did not accept connections on any of its addresses':
    'O servidor SMTP não aceitou conexão. Confira host e porta.',
  'only owners delete a project': 'Só donos podem excluir o projeto.',
  'only an owner can hand the project over': 'Só donos podem transferir o projeto.',
  'the project is already yours': 'O projeto já é seu.',
}

/** What a refusal with a generic code means when its English text is not one of the above. */
export const FALLBACK_BY_CODE: Record<string, string> = {
  invalid_request: 'Algum dado não foi aceito. Revise os campos e tente de novo.',
  not_found: 'Isso não existe mais. Recarregue a página.',
  conflict: 'Isso mudou enquanto você olhava. Recarregue a página e tente de novo.',
}

/**
 * Refusals whose English text is the detail itself (Postgres's own message): shown after this
 * lead, since no translation could say which column or statement failed.
 */
export const LEAD_BY_CODE: Record<string, string> = {
  sql_error: 'O Postgres recusou',
  invalid_query: 'Pedido recusado',
}
