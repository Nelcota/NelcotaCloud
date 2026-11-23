import { relative } from 'node:path'

/** Paths relative to where the user is, as they would type them. */
export function displayPath(cwd: string, path: string): string {
  return relative(cwd, path) || '.'
}
