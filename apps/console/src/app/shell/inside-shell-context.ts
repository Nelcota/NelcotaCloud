import { createContext } from 'react'

/** True under the signed-in frame, where a status message must not bring its own frame. */
export const InsideShellContext = createContext(false)
