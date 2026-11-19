import type { JSX, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import { AuthMascotFan } from '@/modules/account/components/auth-mascots'
import { HelpLine } from '@/modules/account/components/support-link'
import { type StatusMark, StatusIcon } from '@/shared/ui/status-icon'

const PRODUCT_NAME = 'Nelcota'

/**
 * Every login and email-link page is a single task, so its text and controls are a step larger
 * than the console's compact scale, set here in one place rather than in each form. Links
 * styled as buttons (`<a>` children) take the same full width and height as the submit button.
 */
const LARGER_CONTROLS = [
  '[&_[data-slot=label]]:text-base',
  '[&_[data-slot=input]]:h-11 [&_[data-slot=input]]:text-base',
  '[&_[data-slot=button]]:text-base',
  '[&_[data-slot=button][type=submit]]:h-11 [&_[data-slot=button].w-full]:h-11',
  '[&_[data-slot=field-hint]]:text-sm',
  '[&>a]:h-11 [&>a]:w-full [&>a]:text-base',
].join(' ')

type AuthCardProps = {
  title: string
  /** The browser tab's name; defaults to the title. */
  tabTitle?: string
  description?: ReactNode
  /** The step's icon above the title: what it asks for, how it went, or that it is loading. */
  mark?: StatusMark
  children: ReactNode
  /** The way to another page (sign up, back to login), pinned to the foot of the panel. */
  footer?: ReactNode
}

/**
 * The content of every login and email-link page: the mascots, a centered heading, the form,
 * and the footer at the bottom of the panel.
 */
export function AuthCard(props: AuthCardProps): JSX.Element {
  const { title, tabTitle, description, mark, children, footer } = props
  const tabName = tabTitle ?? title

  useEffect(() => {
    document.title = `${tabName} · ${PRODUCT_NAME}`
  }, [tabName])

  return (
    <section className="flex flex-1 flex-col">
      <div className="my-auto grid gap-7 py-8 sm:gap-8 sm:py-10">
        <AuthMascotFan isCalm={mark?.tone === 'danger'} />
        <header className="grid justify-items-center gap-2 text-center">
          <StatusIcon mark={mark} />
          <StepHeading key={title} title={title} />
          <AuthDescription description={description} />
        </header>
        <div className={`grid gap-5 [&_[data-slot=button][type=submit]]:w-full ${LARGER_CONTROLS}`}>
          {children}
        </div>
      </div>
      <footer className="grid gap-2">
        <AuthFooter footer={footer} />
        <HelpLine />
      </footer>
    </section>
  )
}

/**
 * Keyed by its title, so it mounts again on every step. When a step opens without a field to
 * focus (a notice, a result, or a phone where fields do not take focus on their own), the
 * heading takes it, so screen readers announce the new step.
 */
function StepHeading({ title }: { title: string }): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const heading = headingRef.current

    if (heading === null || document.activeElement !== document.body) {
      return
    }

    heading.focus({ preventScroll: true })
  }, [])

  return (
    <h1
      ref={headingRef}
      tabIndex={-1}
      className="text-3xl leading-tight text-balance outline-none sm:text-4xl"
    >
      {title}
    </h1>
  )
}

function AuthDescription({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-muted-foreground text-base text-pretty sm:text-lg">{description}</p>
}

function AuthFooter({ footer }: { footer?: ReactNode }): JSX.Element | null {
  if (footer === undefined) {
    return null
  }

  return <p className="text-muted-foreground text-center text-base">{footer}</p>
}
