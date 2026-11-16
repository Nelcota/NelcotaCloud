const LOCAL_API_URL = 'http://localhost:8080'

/** Address of the NelcotaCloud API, fixed at build time by `VITE_API_URL`. */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? LOCAL_API_URL
