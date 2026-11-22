/**
 * Narrow panels keep email, status and the menu; the rest appears as the panel (not the window)
 * widens, since the project sidebar takes part of the window from 1024px up.
 */
export const USER_COLUMN_VISIBILITY = {
  id: 'hidden @min-[40rem]:table-cell',
  methods: 'hidden @min-[52rem]:table-cell',
  createdAt: 'hidden @min-[64rem]:table-cell',
  lastSignIn: 'hidden @min-[30rem]:table-cell',
} as const
