import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readSchema } from '@/modules/database/api/read-schema'
import type { components } from '@/shared/api/api-schema'

/** Every database query of a project (schema and rows); invalidate it after any change. */
export function databaseKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'database']
}

function schemaKey(projectId: string): readonly string[] {
  return [...databaseKey(projectId), 'schema']
}

export function useSchemaQuery(
  projectId: string,
): UseQueryResult<components['schemas']['SchemaOverview']> {
  return useQuery({
    queryKey: schemaKey(projectId),
    queryFn: () => readSchema(projectId),
  })
}
