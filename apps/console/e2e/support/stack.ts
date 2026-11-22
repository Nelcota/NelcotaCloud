import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** What the global setup created for this run; read by every test. */
export type E2eStack = {
  email: string
  password: string
  projectId: string
  projectName: string
  table: string
  /** App users signed up through the project, unconfirmed. */
  users: string[]
  /** A second console account in the project with the viewer role. */
  viewer: { email: string; password: string }
}

export const STACK_FILE = fileURLToPath(new URL('../.auth/stack.json', import.meta.url))

export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:8097'
export const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8026'

export function readStack(): E2eStack {
  return JSON.parse(readFileSync(STACK_FILE, 'utf8')) as E2eStack
}

/** Waits for the newest email to `recipient` and answers its plain text. */
export async function waitForEmail(recipient: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const query = encodeURIComponent(`to:"${recipient}"`)
    const found = (await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`)).json()) as {
      messages?: { ID: string }[]
    }
    const id = found.messages?.[0]?.ID

    if (id !== undefined) {
      const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json()) as {
        Text: string
        Subject: string
      }

      return `${message.Subject}\n${message.Text}`
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`no email arrived for ${recipient}`)
}
