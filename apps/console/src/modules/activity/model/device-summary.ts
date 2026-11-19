import { parse } from 'bowser'

/**
 * The browser and system a user agent names, such as "Chrome 131 · Windows 10". `null` when it
 * names neither, as with a server library: the raw text is shown instead.
 */
export function deviceSummary(userAgent: string | null | undefined): string | null {
  if (userAgent === null || userAgent === undefined || userAgent.trim() === '') {
    return null
  }

  const parsed = parse(userAgent)
  const browser = joined([parsed.browser.name, majorVersion(parsed.browser.version)], ' ')
  const system = joined([parsed.os.name, parsed.os.versionName ?? parsed.os.version], ' ')
  const parts = [browser, system].filter((part) => part !== '')

  if (parts.length === 0) {
    return null
  }

  return parts.join(' · ')
}

/** "131.0.6778.86" reads as "131": the rest only matters to the browser's makers. */
function majorVersion(version: string | undefined): string | undefined {
  return version?.split('.').at(0)
}

function joined(parts: readonly (string | undefined)[], separator: string): string {
  return parts.filter((part) => part !== undefined && part !== '').join(separator)
}
