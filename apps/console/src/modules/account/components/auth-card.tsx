import type { JSX, ReactNode } from 'react'

type AuthCardProps = {
  title: string
  description?: ReactNode
  children: ReactNode
  /** An alternate action, such as switching between signing in and signing up. */
  footer?: ReactNode
}

/** One sign-in or email-link task: its heading, optional description, controls and way out. */
export function AuthCard({ title, description, children, footer }: AuthCardProps): JSX.Element {
  return (
    <section className="flex flex-col gap-8">
      <div className="grid gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-heading">{title}</h1>
        <AuthDescription description={description} />
      </div>
      <div className="flex flex-col gap-4">{children}</div>
      <AuthFooter footer={footer} />
    </section>
  )
}

function AuthDescription({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-base text-pretty text-muted-foreground">{description}</p>
}

function AuthFooter({ footer }: { footer?: ReactNode }): JSX.Element | null {
  if (footer === undefined) {
    return null
  }

  return <div className="flex flex-col gap-3">{footer}</div>
}
