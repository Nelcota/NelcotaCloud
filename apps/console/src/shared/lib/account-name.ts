/** The part of the email before `@`: the closest thing to a name a console account has. */
export function nameOf(email: string): string {
  return email.split('@')[0] ?? email
}
