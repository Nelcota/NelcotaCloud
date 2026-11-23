import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readDatabaseTypes } from '@/modules/database/api/read-database-types'
import { databaseKey } from '@/modules/database/queries/use-schema-query'

/** Under `databaseKey`, so a schema change also refreshes the types. */
export function useDatabaseTypesQuery(projectId: string): UseQueryResult<string> {
  return useQuery({
    queryKey: [...databaseKey(projectId), 'types'],
    queryFn: () => readDatabaseTypes(projectId),
  })
}
