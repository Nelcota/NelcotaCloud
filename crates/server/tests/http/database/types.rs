use reqwest::StatusCode;
use serde_json::{Value, json};

use crate::support::{CreatedTenant, TestResult, TestServer};

const SCHEMA: &str = "
create type order_status as enum ('open', 'paid');
create table orders (
    id bigint generated always as identity primary key,
    title text not null,
    note text,
    status order_status not null default 'open',
    tags text[] not null default '{}',
    total numeric,
    title_length int generated always as (length(title)) stored
);
create view open_orders as select id, title from orders where status = 'open';
create function order_count(minimum int default 0) returns bigint
    language sql stable as 'select count(*) from orders where id >= minimum';
";

async fn post_sql(server: &TestServer, tenant: &CreatedTenant, query: &str) -> TestResult {
    let response = server
        .client
        .post(server.url("/database/v1/sql"))
        .header("apikey", &tenant.secret_key)
        .json(&json!({ "query": query }))
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::OK);

    Ok(())
}

async fn generated_types(server: &TestServer, tenant: &CreatedTenant) -> TestResult<String> {
    let response = server
        .client
        .get(server.url("/database/v1/types"))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    let body: Value = response.json().await?;
    let typescript = body
        .get("typescript")
        .and_then(Value::as_str)
        .ok_or("the response has no typescript")?;

    Ok(typescript.to_owned())
}

/// Tables, views, enums and functions come out as the SDK's `Database` type.
#[tokio::test]
async fn types_follow_the_schema() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    post_sql(&server, &tenant, SCHEMA).await?;

    let typescript = generated_types(&server, &tenant).await?;

    assert!(typescript.contains("export type Database = {"));
    assert!(typescript.contains("order_status: \"open\" | \"paid\""));
    assert!(typescript.contains("status: Database[\"public\"][\"Enums\"][\"order_status\"]\n"));
    assert!(typescript.contains("tags: (string)[]"));
    assert!(typescript.contains("note: string | null"));
    assert!(typescript.contains("total: number | null"));
    assert!(typescript.contains("Insert: {\n          id?: number\n          title: string\n"));
    // Generated columns are read, never written: only the row of the table (not the view) has it.
    assert!(typescript.contains("title_length: number | null\n        }\n        Insert"));
    assert_eq!(typescript.matches("title_length").count(), 1);
    assert!(typescript.contains("open_orders: {\n        Row: {"));
    assert!(typescript.contains("order_count: {\n        Args: {\n          minimum?: number"));
    assert!(typescript.contains("Returns: number"));
    server.drop_tenant(&tenant).await
}

/// A project without tables still gets a usable, empty `Database` type.
#[tokio::test]
async fn an_empty_schema_has_empty_sections() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let typescript = generated_types(&server, &tenant).await?;

    assert!(typescript.contains("Tables: { [_ in never]: never }"));
    assert!(typescript.contains("Enums: { [_ in never]: never }"));
    server.drop_tenant(&tenant).await
}
