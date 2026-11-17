import type { JSX } from 'react'

import { Card } from './card'
import { FormFeedback } from './form-feedback'
import { HomeLink } from './home-link'

type LinkStatusProps = { title: string; error: string | null; done: string | null }

/** What a page that redeems a link shows: progress, its result or why it failed. */
export function LinkStatus({ title, error, done }: LinkStatusProps): JSX.Element {
  if (error === null && done === null) {
    return (
      <Card title={title}>
        <p role="status">Verificando o link…</p>
      </Card>
    )
  }

  return (
    <Card title={title}>
      <FormFeedback error={error} notice={done} />
      <HomeLink />
    </Card>
  )
}
