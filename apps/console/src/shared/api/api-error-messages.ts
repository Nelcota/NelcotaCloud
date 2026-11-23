/**
 * The API speaks English. These are the sentences people read instead, in Portuguese, keyed
 * first by the stable error code.
 */
export const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: 'Email ou senha incorretos.',
  email_taken: 'Já existe uma conta com esse email.',
  email_not_verified:
    'Confirme seu email antes de entrar. O link está na sua caixa de entrada ou no spam.',
  invalid_token: 'Este link expirou ou já foi usado. Peça um novo.',
  invalid_mfa_code: 'Código incorreto. Confira o código no app e digite de novo.',
  invalid_refresh_token: 'Sua sessão terminou. Entre de novo.',
  invalid_access_token: 'Sua sessão terminou. Entre de novo.',
  user_banned: 'Esta conta está bloqueada.',
  email_already_verified: 'Este email já foi confirmado.',
  too_many_requests: 'Muitas tentativas em pouco tempo. Espere um minuto e tente de novo.',
  slug_taken: 'Esse identificador já está em uso. Escolha outro.',
  project_access_denied: 'Você não tem mais acesso a este projeto.',
  mascot_save_unconfirmed:
    'A API não confirmou a escolha do mascote. Verifique se o servidor está atualizado.',
  read_only_member:
    'Você tem acesso só de leitura neste projeto. Peça a um dono para permitir edição.',
  notification_channel_limit:
    'O projeto já tem 5 canais de notificação. Remova um para adicionar outro.',
  notification_test_failed: 'O canal não aceitou o teste. Confira o endereço ou a URL do webhook.',
  admin_access_denied: 'Você não tem permissão para isso neste projeto.',
  secret_key_required: 'Essa ação exige uma secret key.',
  smtp_delivery_failed:
    'O servidor SMTP não aceitou o email. Confira host, porta, usuário e senha.',
  provider_not_configured: 'Esse login social não está configurado neste projeto.',
  unknown_provider: 'Esse provedor de login não existe.',
  invalid_oauth_code: 'O login social expirou. Comece de novo.',
  webhook_endpoint_limit:
    'O projeto atingiu o limite de endpoints. Exclua um antes de criar outro.',
  last_owner: 'O projeto precisa de pelo menos um dono. Transfira a propriedade antes.',
  owned_project_limit: 'Essa conta já é dona do máximo de 10 projetos.',
  already_member: 'Essa pessoa já faz parte da equipe.',
  already_invited: 'Já existe um convite pendente para esse email.',
  payload_too_large: 'O arquivo é grande demais.',
  storage_unavailable: 'O armazenamento de arquivos está indisponível.',
  storage_bucket_not_found: 'Este bucket não existe mais.',
  storage_object_not_found: 'Este arquivo não está disponível.',
  storage_bucket_exists: 'Já existe um bucket com esse nome.',
  storage_bucket_limit: 'O projeto atingiu o limite de buckets.',
  storage_quota_exceeded: 'O projeto atingiu o limite de armazenamento.',
  storage_pending_quota_exceeded:
    'O limite de envios pendentes foi atingido. Conclua ou descarte um envio e tente de novo.',
  storage_location_mismatch: 'O bucket físico deste projeto está indisponível.',
  storage_upload_expired: 'O envio expirou. Descarte a tentativa para iniciar outro envio.',
  storage_upload_missing: 'O arquivo ainda não chegou. Tente enviá-lo novamente.',
  storage_upload_mismatch: 'O arquivo recebido é diferente do selecionado.',
  storage_upload_failed: 'O arquivo não pôde ser enviado. Tente de novo.',
  platform_not_configured: 'O console ainda não foi configurado neste servidor.',
  internal_error: 'Erro no servidor. Tente de novo em instantes.',
  query_timeout: 'A consulta passou de 15 segundos e foi cancelada.',
  table_not_found: 'Essa tabela não existe mais. Recarregue a página.',
  invalid_value: 'Algum valor não combina com o tipo da coluna. Confira números, datas e JSON.',
  filter_required: 'Atualizar ou excluir linhas exige pelo menos um filtro.',
  database_busy: 'O banco está ocupado. Tente de novo em alguns segundos.',
  transaction_conflict: 'Outra alteração aconteceu ao mesmo tempo. Tente de novo.',
  response_too_large: 'A resposta passaria de 16 MiB. Selecione menos colunas ou linhas.',
  direct_connection_disabled: 'Este servidor não oferece conexão direta ao Postgres.',
  permission_denied: 'Os privilégios ou as políticas da tabela recusaram o acesso.',
  invalid_captcha_secret:
    'O Cloudflare não reconhece essa secret key. Copie de novo do widget do Turnstile.',
  captcha_unavailable: 'Não foi possível falar com o Cloudflare. Tente de novo em instantes.',
  captcha_required: 'Resolva o captcha antes de continuar.',
  captcha_failed: 'O captcha não foi resolvido. Tente de novo.',
  cache_owner_required: 'Apenas donos do projeto podem gerenciar o cache.',
  cache_disabled: 'Ative o cache do projeto para continuar.',
  cache_unavailable: 'O serviço de cache está indisponível. Tente de novo em instantes.',
  cache_credential_limit:
    'O projeto atingiu o limite de 10 credenciais. Revogue uma para criar outra.',
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
