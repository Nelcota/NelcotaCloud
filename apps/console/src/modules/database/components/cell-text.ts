export function cellText(value: unknown, indent?: number): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, indent)
  }

  return String(value)
}
