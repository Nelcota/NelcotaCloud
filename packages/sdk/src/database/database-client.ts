import type { HttpClient } from '../http/http-client'
import { newRequest } from './query-request'
import type { QueryResult } from './query-request'
import { type QuerySession, QuerySender } from './query-sender'
import type {
  ArgsOf,
  FunctionName,
  GenericDatabase,
  InsertOf,
  RelationName,
  ReturnsOf,
  RowOf,
  UpdateOf,
} from './database-types'
import { TableQuery } from './table-query'

/** The typed query of one table or view of `Database`. */
export type RelationQuery<
  Database extends GenericDatabase,
  Name extends RelationName<Database>,
> = TableQuery<RowOf<Database, Name>, InsertOf<Database, Name>, UpdateOf<Database, Name>>

/**
 * The project's Postgres database through the Data API. Requests run as the logged-in user
 * (or anonymously), so the tables' row level security policies decide what they reach.
 */
export class DatabaseClient<Database extends GenericDatabase = GenericDatabase> {
  private readonly sender: QuerySender

  constructor(http: HttpClient, session: QuerySession) {
    this.sender = new QuerySender(http, session)
  }

  from<Name extends RelationName<Database>>(table: Name): RelationQuery<Database, Name> {
    return new TableQuery(this.sender, table)
  }

  /** Calls a function of the `public` schema with named arguments. */
  rpc<Name extends FunctionName<Database>>(
    name: Name,
    args: ArgsOf<Database, Name> = {},
  ): Promise<QueryResult<ReturnsOf<Database, Name>>> {
    const request = newRequest('POST', `/rpc/${encodeURIComponent(name)}`)
    request.body = args

    return this.sender.send<ReturnsOf<Database, Name>>(request)
  }
}
