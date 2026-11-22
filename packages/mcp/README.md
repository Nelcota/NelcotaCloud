# @nelcota/mcp

MCP server that lets an AI agent (Claude Code, Cursor, Codex) work on one NelcotaCloud project:
read the schema, query and change rows, run SQL, look at users, the activity log and the Data
API traffic.

It runs on your machine over stdio and calls the API with the project's **secret key**, which
bypasses row level security. Use it only in development, with a key you can revoke in the
console (Chaves de API).

## Setup

Build it once:

```sh
npm install
npm run build
```

Claude Code:

```sh
claude mcp add nelcota \
  --env NELCOTA_SECRET_KEY=nc_sk_... \
  --env NELCOTA_API_URL=https://api.example.com \
  -- node /path/to/packages/mcp/dist/index.mjs
```

Cursor (`.cursor/mcp.json`) and other clients take the same command and variables:

```json
{
  "mcpServers": {
    "nelcota": {
      "command": "node",
      "args": ["/path/to/packages/mcp/dist/index.mjs"],
      "env": { "NELCOTA_SECRET_KEY": "nc_sk_...", "NELCOTA_API_URL": "https://api.example.com" }
    }
  }
}
```

`NELCOTA_API_URL` defaults to `http://localhost:8080`.

## Tools

| Tool | What it does |
| --- | --- |
| `list_tables` | Tables and views, with rows, size and RLS |
| `describe_table` | Columns, foreign keys, indexes and policies of one table |
| `query_rows` | Reads rows with `select`, filters, order and pages |
| `insert_rows` | Inserts up to 1000 rows |
| `update_rows` | Changes the rows the filters match (filters required) |
| `delete_rows` | Deletes the rows the filters match (filters required) |
| `run_sql` | Runs SQL as the developer role (schema changes, policies, functions) |
| `list_users` | Users of the app, by email or status |
| `activity_log` | Logins, refused logins and admin actions |
| `api_traffic` | Requests, errors and the busiest tables over 24h, 7d or 30d |
| `project_settings` | Name, site URL and email verification |

## Commands

`npm run build`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`.
