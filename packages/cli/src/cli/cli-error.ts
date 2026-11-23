/** A refusal the user can act on: its message is printed as is, without a stack trace. */
export class CliError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CliError'
  }
}
