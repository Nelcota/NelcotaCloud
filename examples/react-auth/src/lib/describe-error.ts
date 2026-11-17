import { NelcotaError } from '@nelcota/sdk'

/** `code` is stable, so apps can map it to their own messages; this example shows it as is. */
export function describeError(error: unknown): string {
  if (error instanceof NelcotaError) {
    return `${error.message} (${error.code})`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Algo deu errado. Tente de novo.'
}
