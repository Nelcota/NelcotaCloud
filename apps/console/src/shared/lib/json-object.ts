export type JsonObject = { [key: string]: unknown }

export type JsonObjectParse = { object: JsonObject; error: null } | { object: null; error: string }

/** Reads text typed by a person that must hold a JSON object (not an array or a value). */
export function parseJsonObject(text: string): JsonObjectParse {
  const parsed = tryParse(text)

  if (parsed === undefined) {
    return { object: null, error: 'JSON inválido.' }
  }

  if (isJsonObject(parsed) === false) {
    return { object: null, error: 'Use um objeto JSON, entre { }.' }
  }

  return { object: parsed, error: null }
}

export function formatJsonObject(object: JsonObject): string {
  return JSON.stringify(object, null, 2)
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false
}
