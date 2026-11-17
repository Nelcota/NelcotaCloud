import type { JSX, ReactNode } from 'react'

import { AuthBrand } from '@/modules/account/components/auth-brand'

type AuthCardProps = {
  title: string
  description?: ReactNode
  /** A state shown above the title (done, failed), for pages that report a result. */
  icon?: ReactNode
  children: ReactNode
  /** A line under the card, such as the way to switch between signing in and signing up. */
  footer?: ReactNode
}

/**
 * Every login and email-link page is a single task, so its fields and main button are scaled
 * up here, in one place, rather than in each form.
 */
const LARGE_CONTROLS = [
  '[&_[data-slot=label]]:text-base',
  '[&_[data-slot=input]]:h-13 [&_[data-slot=input]]:rounded-xl [&_[data-slot=input]]:px-4 [&_[data-slot=input]]:text-lg',
  '[&_[data-slot=button][type=submit]]:h-13 [&_[data-slot=button][type=submit]]:rounded-xl [&_[data-slot=button][type=submit]]:text-lg',
].join(' ')

/** The frame of every login and email-link page: the brand, a heading that says what to do, then the form. */
export function AuthCard(props: AuthCardProps): JSX.Element {
  const { title, description, icon, children, footer } = props

  return (
    <div className="grid gap-6">
      <section className="bg-card rounded-3xl border px-6 py-10 sm:px-10 sm:py-12">
        <header className="mb-8 flex flex-col items-center text-center">
          <AuthBrand />
          {icon}
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance">
            {title}
          </h1>
          <AuthDescription description={description} />
        </header>
        <div className={`grid gap-5 text-base ${LARGE_CONTROLS}`}>{children}</div>
      </section>
      <AuthFooter footer={footer} />
    </div>
  )
}

function AuthDescription({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-muted-foreground mt-2 text-lg text-pretty">{description}</p>
}

function AuthFooter({ footer }: { footer?: ReactNode }): JSX.Element | null {
  if (footer === undefined) {
    return null
  }

  return <div className="text-muted-foreground text-center text-base">{footer}</div>
}
