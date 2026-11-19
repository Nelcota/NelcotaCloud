import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
} from '@tanstack/react-query'

import {
  type MigrationHistory,
  listMigrations,
} from '@/modules/database/migrations/api/list-migrations'
import { databaseKey } from '@/modules/database/queries/use-schema-query'

export function useMigrationHistoryQuery(
  projectId: string,
): UseInfiniteQueryResult<InfiniteData<MigrationHistory, number | undefined>> {
  return useInfiniteQuery({
    queryKey: [...databaseKey(projectId), 'migrations'],
    queryFn: ({ pageParam }) => listMigrations(projectId, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_before ?? undefined,
  })
}
