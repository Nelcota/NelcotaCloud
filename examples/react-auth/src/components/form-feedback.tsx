import type { JSX } from 'react'

type FormFeedbackProps = { error: string | null; notice?: string | null }

/** The error of the last attempt, or the note that it worked. */
export function FormFeedback({ error, notice = null }: FormFeedbackProps): JSX.Element | null {
  if (error !== null) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    )
  }

  if (notice !== null) {
    return (
      <p className="notice" role="status">
        {notice}
      </p>
    )
  }

  return null
}
