/** The API's stable error code on an SDK or API error, or an empty string for anything else. */
export function errorCodeOf(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return ''
  }

  const code: unknown = Reflect.get(error, 'code')

  if (typeof code !== 'string') {
    return ''
  }

  return code
}
