import type { JSX, MouseEvent } from 'react'

import { navigate } from '../lib/navigation'

function goHome(event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault()
  navigate('/')
}

export function HomeLink(): JSX.Element {
  return (
    <a href="/" onClick={goHome}>
      Voltar ao início
    </a>
  )
}
