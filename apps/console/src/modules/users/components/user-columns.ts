/** Narrow screens keep email, status and the menu; the rest appears as the width allows. */
export const USER_COLUMN_VISIBILITY = {
  id: 'hidden md:table-cell',
  methods: 'hidden lg:table-cell',
  createdAt: 'hidden xl:table-cell',
  lastSignIn: 'hidden sm:table-cell',
} as const
