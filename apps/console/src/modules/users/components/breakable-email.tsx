import type { JSX } from 'react'

/**
 * An email that wraps before its "@" instead of mid-word ("…com.b / r") on narrow screens; the
 * domain stays whole ("@exemplo.com.br") unless it alone is too long for the line.
 */
export function BreakableEmail({ email }: { email: string }): JSX.Element {
  const [localPart = '', domain = ''] = splitAtSign(email)
  return (
    <>
      {localPart}
      <wbr />
      <span className="[overflow-wrap:anywhere]">{domain}</span>
    </>
  )
}

/** The local part stays whole: its dots are part of a name ("gabriela.silva"). */
function splitAtSign(email: string): string[] {
  const atIndex = email.lastIndexOf('@')

  if (atIndex < 0) {
    return [email]
  }

  return [email.slice(0, atIndex), email.slice(atIndex)]
}
