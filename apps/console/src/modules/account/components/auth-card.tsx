import type { JSX, ReactNode } from 'react'

type AuthCardProps = {
  title: string
  description?: ReactNode
  /** A state shown above the title (done, failed), for pages that report a result. */
  icon?: ReactNode
  children: ReactNode
  /** A line under the card, such as the way to switch between signing in and signing up. */
  footer?: ReactNode
}

/** The frame of every login and email-link page: a heading that says what to do, then the form. */
export function AuthCard(props: AuthCardProps): JSX.Element {
  const { title, description, icon, children, footer } = props

  return (
    <div className="grid gap-4">
      <section className="bg-card rounded-2xl border p-6 shadow-xl shadow-black/5 sm:p-8">
        <header className="mb-6">
          {icon}
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <AuthDescription description={description} />
        </header>
        <div className="grid gap-4">{children}</div>
      </section>
      <AuthFooter footer={footer} />
    </div>
  )
}

function AuthDescription({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-muted-foreground mt-1.5 text-sm text-pretty">{description}</p>
}

function AuthFooter({ footer }: { footer?: ReactNode }): JSX.Element | null {
  if (footer === undefined) {
    return null
  }

  return <div className="text-muted-foreground text-center text-sm">{footer}</div>
}
