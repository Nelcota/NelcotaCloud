export const PROJECT_CATALOG_KEY = ['project-catalog'] as const

export function projectDataKey(projectId: string): readonly ['projects', string] {
  return ['projects', projectId]
}
