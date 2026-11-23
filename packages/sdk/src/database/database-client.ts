import type { HttpClient } from '../http/http-client'
import { newRequest } from './query-request'
import type { QueryResult } from './query-request'
import { type QuerySession, QuerySender } from './query-sender'
import type {
  ArgsOf,
  ChosenQuery,
  ChosenResult,
  FunctionName,
  GenericDatabase,
  RelationName,
} from './database-types'
import { TableQuery } from './table-query'

/**
 * The project's Postgres database through the Data API. Requests run as the logged-in user
 * (or anonymously), so the tables' row level security policies decide what they reach.
 */
export class DatabaseClient<Database extends GenericDatabase = GenericDatabase> {
  private readonly sender: QuerySender

  constructor(http: HttpClient, session: QuerySession) {
    this.sender = new QuerySender(http, session)
  }

  /** `from('posts')`, typed by `Database`; `from<Post>('posts')` names the row instead. */
  from<
    Row extends Record<string, unknown> = never,
    Name extends RelationName<Database> = RelationName<Database>,
  >(table: Name): ChosenQuery<Database, Name, Row> {
    return new TableQuery(this.sender, table) as ChosenQuery<Database, Name, Row>
  }

  /** Calls a function of the `public` schema with named arguments. */
  rpc<Result = never, Name extends FunctionName<Database> = FunctionName<Database>>(
    name: Name,
    args: ArgsOf<Database, Name> = {},
  ): Promise<QueryResult<ChosenResult<Database, Name, Result>>> {
    const request = newRequest('POST', `/rpc/${encodeURIComponent(name)}`)
    request.body = args

    return this.sender.send<ChosenResult<Database, Name, Result>>(request)
  }
}
