import { Link } from '@tanstack/react-router'
import type { AnchorHTMLAttributes, JSX, Ref } from 'react'

type RouterLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>
}

const EXTERNAL_HREF = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i

/**
 * Routes console paths through the SPA and leaves external URLs and in-page anchors to the browser.
 */
export function RouterLink({ href, ref, ...anchorProps }: RouterLinkProps): JSX.Element {
  if (href === undefined || EXTERNAL_HREF.test(href)) {
    return <a ref={ref} href={href} {...anchorProps} />
  }

  return <Link ref={ref} to={href} {...anchorProps} />
}
