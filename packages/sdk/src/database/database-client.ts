import type { HttpClient } from '../http/http-client'
import { newRequest } from './query-request'
import type { QueryResult } from './query-request'
import { type QuerySession, QuerySender } from './query-sender'
import { TableQuery } from './table-query'

/**
 * The project's Postgres database through the Data API. Requests run as the logged-in user
 * (or anonymously), so the tables' row level security policies decide what they reach.
 */
export class DatabaseClient {
  private readonly sender: QuerySender

  constructor(http: HttpClient, session: QuerySession) {
    this.sender = new QuerySender(http, session)
  }

  from<Row extends Record<string, unknown> = Record<string, unknown>>(
    table: string,
  ): TableQuery<Row> {
    return new TableQuery<Row>(this.sender, table)
  }

  /** Calls a function of the `public` schema with named arguments. */
  rpc<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<QueryResult<T>> {
    const request = newRequest('POST', `/rpc/${encodeURIComponent(name)}`)
    request.body = args

    return this.sender.send<T>(request)
  }
}
