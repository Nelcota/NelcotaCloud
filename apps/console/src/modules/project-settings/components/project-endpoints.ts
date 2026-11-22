import { API_BASE_URL } from '@/shared/api/api-base-url'

export type ProjectEndpoint = {
  label: string
  /** What the address is for, in one line. */
  meaning: string
  value: string
}

/** The addresses a developer wires into an app, all under the API's base URL. */
export const PROJECT_ENDPOINTS: readonly ProjectEndpoint[] = [
  {
    label: 'URL da API',
    meaning: 'Base de todas as chamadas; vai no createClient.',
    value: API_BASE_URL,
  },
  {
    label: 'Auth',
    meaning: 'Cadastro, login, sessões, MFA e OAuth.',
    value: `${API_BASE_URL}/auth/v1`,
  },
  {
    label: 'Data API',
    meaning: 'As tabelas do schema public como REST, sob RLS.',
    value: `${API_BASE_URL}/rest/v1`,
  },
  {
    label: 'Storage',
    meaning: 'Buckets e arquivos do projeto.',
    value: `${API_BASE_URL}/storage/v1`,
  },
  {
    label: 'JWKS',
    meaning: 'Chaves públicas dos access tokens; pede o header apikey.',
    value: `${API_BASE_URL}/auth/v1/jwks`,
  },
  {
    label: 'OpenAPI',
    meaning: 'Descrição de todos os endpoints, para gerar tipos.',
    value: `${API_BASE_URL}/openapi.json`,
  },
]
