import type { JSX } from 'react'

import { CopyableValue } from '@/shared/ui/copyable-value'
import { Notice } from '@/shared/ui/notice'
import { CheckboxField } from '@/shared/ui/switch-field'

type SecretKeyPanelProps = {
  secretKey: string
  isSaved: boolean
  onSavedChange: (isSaved: boolean) => void
}

/** The secret key, shown only once: leaving asks until the box says it was saved. */
export function SecretKeyPanel(props: SecretKeyPanelProps): JSX.Element {
  return (
    <div className="grid gap-3 rounded-xl bg-card p-4">
      <Notice tone="warning" title="Copie a chave secreta agora">
        Ela não aparece de novo. Use só no servidor.
      </Notice>
      <CopyableValue label="Chave secreta" value={props.secretKey} />
      <CheckboxField
        label="Guardei a chave secreta em um lugar seguro"
        checked={props.isSaved}
        onCheckedChange={props.onSavedChange}
      />
    </div>
  )
}
