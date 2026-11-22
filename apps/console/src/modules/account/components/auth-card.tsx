import type { JSX, ReactNode } from 'react'

type AuthCardProps = {
  title: string
  description?: ReactNode
  children: ReactNode
  /** An alternate action, such as switching between signing in and signing up. */
  footer?: ReactNode
}

/** One sign-in or email-link task inside its panel: heading, controls, and a footer bar. */
export function AuthCard({ title, description, children, footer }: AuthCardProps): JSX.Element {
  return (
    <section className="flex flex-col">
      <div className="flex flex-col gap-5 p-6">
        <header className="grid gap-1">
          <h1 className="text-xl font-medium text-balance text-heading">{title}</h1>
          <AuthDescription description={description} />
        </header>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
      <AuthFooter footer={footer} />
    </section>
  )
}

function AuthDescription({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-xs text-pretty text-muted-foreground">{description}</p>
}

function AuthFooter({ footer }: { footer?: ReactNode }): JSX.Element | null {
  if (footer === undefined) {
    return null
  }

  return <div className="flex flex-col gap-2 rounded-b-2xl bg-surface px-6 py-3">{footer}</div>
}
