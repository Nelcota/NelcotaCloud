import type { HttpClient, HttpRequest } from './http-client'

export type AccessTokenSource = { accessToken(): Promise<string> }

export type AuthorizedContext = { http: HttpClient; manager: AccessTokenSource }

/** Sends a request as the logged-in user, with an access token renewed first when needed. */
export async function authorizedRequest<T>(
  context: AuthorizedContext,
  request: Omit<HttpRequest, 'accessToken'>,
): Promise<T> {
  const accessToken = await context.manager.accessToken()

  return context.http.request<T>({ ...request, accessToken })
}
