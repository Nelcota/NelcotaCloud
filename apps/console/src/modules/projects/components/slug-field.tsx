import Pen from '~icons/solar/pen-linear'
import type { JSX } from 'react'

import {
  isValidSlug,
  MAX_SLUG_LENGTH,
  SLUG_PATTERN,
} from '@/modules/projects/components/project-slug'
import { Button } from '@/shared/ui/button'
import { FormField } from '@/shared/ui/form-field'

const SLUG_HINT = '3 a 40 letras minúsculas, números ou _, começando por letra. Não muda depois.'

type SlugFieldProps = {
  slug: string
  /** Null while the slug follows the name. */
  customSlug: string | null
  onCustomSlugChange: (slug: string) => void
}

/** The slug made from the name, shown as is; "Editar" opens it for typing. */
export function SlugField(props: SlugFieldProps): JSX.Element | null {
  const { slug, customSlug, onCustomSlugChange } = props

  if (customSlug !== null) {
    return (
      <FormField
        label="Identificador"
        required
        autoFocus
        pattern={SLUG_PATTERN}
        maxLength={MAX_SLUG_LENGTH}
        autoComplete="off"
        className="font-mono"
        hint={SLUG_HINT}
        value={slug}
        onChange={(event) => onCustomSlugChange(event.target.value)}
      />
    )
  }

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="text-muted-foreground">Identificador:</span>
        <SlugValue slug={slug} />
        <Button type="button" variant="ghost" size="sm" onClick={() => onCustomSlugChange(slug)}>
          <Pen aria-hidden="true" />
          Editar
        </Button>
      </div>
      <InvalidSlugHint slug={slug} />
    </div>
  )
}

function SlugValue({ slug }: { slug: string }): JSX.Element | null {
  if (slug === '') {
    return null
  }

  return <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{slug}</code>
}

/** Names too short or without letters ("123") give no valid slug: the user has to choose one. */
function InvalidSlugHint({ slug }: { slug: string }): JSX.Element | null {
  if (isValidSlug(slug)) {
    return null
  }

  return <p className="text-muted-foreground text-xs">{SLUG_HINT}</p>
}
