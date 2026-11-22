/** "api.example.com" from the API's address, for the Host line of a raw HTTP request. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
