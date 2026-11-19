import type { IconComponent } from '@/shared/ui/icon-component'

/** Room the input leaves on its left for the icon, so typed text never runs under it. */
const FIELD_ICON_PADDING = 'pl-10'

/** The input's padding class: room for the icon when there is one. */
export function fieldIconPadding(icon?: IconComponent): string {
  if (icon === undefined) {
    return ''
  }

  return FIELD_ICON_PADDING
}
