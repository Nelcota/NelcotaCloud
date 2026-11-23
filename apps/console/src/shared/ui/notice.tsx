import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/primitives/alert'
import { Button } from '@/shared/ui/primitives/button'

export type NoticeTone = 'info' | 'success' | 'warning' | 'error'

const TONES: Record<NoticeTone, string> = {
  info: 'border-transparent bg-surface text-foreground [&>svg]:text-info',
  success: 'border-transparent bg-surface text-foreground [&>svg]:text-success',
  warning: 'border-warning/20 bg-warning/6 text-foreground [&>svg]:text-warning',
  error: 'border-destructive/25 bg-destructive/6 text-foreground [&>svg]:text-destructive',
}

const GLYPHS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert }

type NoticeProps = {
  tone: NoticeTone
  title?: ReactNode
  children?: ReactNode
  /** A control at the end of the strip, such as a retry button or a link. */
  action?: ReactNode
  onDismiss?: () => void
  className?: string
}

/** A strip that tells the state of the page, like the health line above the metrics. */
export function Notice({
  tone,
  title,
  children,
  action,
  onDismiss,
  className,
}: NoticeProps): JSX.Element {
  const Glyph = GLYPHS[tone]
  const role = tone === 'error' ? 'alert' : 'status'

  return (
    <Alert
      role={role}
      className={cn('flex items-start gap-3 rounded-xl px-4 py-3', TONES[tone], className)}
    >
      <Glyph aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <NoticeTitle title={title} />
        <NoticeBody body={children} />
      </div>
      {action}
      <DismissButton onDismiss={onDismiss} />
    </Alert>
  )
}

function NoticeTitle({ title }: { title?: ReactNode }): JSX.Element | null {
  if (title === undefined || title === null) {
    return null
  }

  return <AlertTitle className="text-sm font-medium">{title}</AlertTitle>
}

function NoticeBody({ body }: { body?: ReactNode }): JSX.Element | null {
  if (body === undefined || body === null) {
    return null
  }

  return <AlertDescription className="text-xs text-muted-foreground">{body}</AlertDescription>
}

function DismissButton({ onDismiss }: { onDismiss?: () => void }): JSX.Element | null {
  if (onDismiss === undefined) {
    return null
  }

  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      aria-label="Fechar aviso"
      onClick={onDismiss}
    >
      <X aria-hidden />
    </Button>
  )
}
