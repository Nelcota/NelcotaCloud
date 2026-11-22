import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { formatJsonObject } from '@/shared/lib/json-object'
import { CodeBlock } from '@/shared/ui/code-block'
import { Button } from '@/shared/ui/primitives/button'
import { Section } from '@/shared/ui/section'

type User = components['schemas']['User']

type UserMetadataPreviewProps = { user: User; onEdit: () => void }

/** Both JSON documents as they are stored, read-only; editing lives in the Metadados tab. */
export function UserMetadataPreview({ user, onEdit }: UserMetadataPreviewProps): JSX.Element {
  return (
    <Section
      title="Metadados"
      action={
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          Editar
        </Button>
      }
    >
      <CodeBlock code={formatJsonObject(user.app_metadata)} title="app_metadata" maxHeight={220} />
      <CodeBlock
        code={formatJsonObject(user.user_metadata)}
        title="user_metadata"
        maxHeight={220}
      />
    </Section>
  )
}
