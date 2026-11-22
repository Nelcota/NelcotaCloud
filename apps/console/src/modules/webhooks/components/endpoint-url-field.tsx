import type { JSX } from 'react'

import { urlProblem, urlWarning } from '@/modules/webhooks/components/endpoint-url-rules'
import { UrlField } from '@/shared/ui/url-field'

const URL_HINT = 'Um endereço https público. Responda com status 2xx em até 10 segundos.'

type EndpointUrlFieldProps = {
  /** As typed, without the `https://` the field already shows. */
  value: string
  onChange: (value: string) => void
  hasAutoFocus?: boolean
}

/** The receiver address, checked as it is typed; an empty field waits for Continue or Save. */
export function EndpointUrlField({
  value,
  onChange,
  hasAutoFocus,
}: EndpointUrlFieldProps): JSX.Element {
  return (
    <UrlField
      label="URL do seu servidor"
      placeholder="api.seuapp.com/webhooks/nelcota"
      hint={urlWarning(value) ?? URL_HINT}
      error={typedProblem(value)}
      isRequired
      hasAutoFocus={hasAutoFocus}
      value={value}
      onChange={onChange}
    />
  )
}

function typedProblem(typed: string): string | undefined {
  if (typed.trim() === '') {
    return undefined
  }

  return urlProblem(typed) ?? undefined
}
