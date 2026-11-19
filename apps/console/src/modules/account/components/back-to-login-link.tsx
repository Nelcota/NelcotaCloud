import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

/** The footer's way back on every page that is not the login itself. */
export function BackToLoginLink(): JSX.Element {
  return (
    <Link
      to="/login"
      className="text-foreground -my-2 inline-block rounded-sm py-2 font-semibold underline-offset-4 hover:underline"
    >
      Voltar para o login
    </Link>
  )
}
