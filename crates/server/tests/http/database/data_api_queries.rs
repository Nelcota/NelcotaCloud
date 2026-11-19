use reqwest::StatusCode;
use reqwest::header::CONTENT_RANGE;
use serde_json::{Value, json};

use super::support::{Credentials, RestRequest, developer_sql, rest, rest_json};
use crate::support::{CreatedTenant, TestResult, TestServer, error_code};

#[tokio::test]
async fn limits_nested_rows_and_refuses_an_over_budget_aggregate() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(
        &server,
        &tenant,
        "CREATE TABLE parents (id integer PRIMARY KEY);
         CREATE TABLE children (id integer PRIMARY KEY, parent_id integer REFERENCES parents, body text);
         INSERT INTO parents VALUES (1);
         INSERT INTO children SELECT n, 1, repeat('x', 20000) FROM generate_series(1, 1200) n;",
    )
    .await?;
    let credentials = Credentials::service(&tenant);
    let paged = rest_json(
        &server,
        credentials,
        "/parents?select=id,children(id)&limit=1",
    )
    .await?;
    assert_eq!(
        paged
            .pointer("/0/children")
            .and_then(Value::as_array)
            .map(Vec::len),
        Some(1_000)
    );
    let response = rest(
        &server,
        credentials,
        RestRequest::get("/parents?select=id,children(body)&limit=1"),
    )
    .await?;
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(error_code(response).await?, "response_too_large");

    server.drop_tenant(&tenant).await
}

/// Authors write posts, posts have comments; RLS is on (new tables) but the tests read with the
/// secret key, which bypasses it.
const BLOG: &str = "
CREATE TABLE authors (id INT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE posts (
    id INT PRIMARY KEY,
    author_id INT NOT NULL REFERENCES authors (id),
    title TEXT NOT NULL,
    views INT NOT NULL DEFAULT 0,
    tags TEXT[] NOT NULL DEFAULT '{}',
    published BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE comments (
    id INT PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts (id),
    body TEXT NOT NULL
);
INSERT INTO authors VALUES (1, 'Ana'), (2, 'Bia');
INSERT INTO posts VALUES
    (1, 1, 'Rust tips', 120, '{rust,tips}', true),
    (2, 1, 'Draft', 0, '{}', false),
    (3, 2, 'Postgres tricks', 300, '{postgres}', true);
INSERT INTO comments VALUES (1, 1, 'Great'), (2, 1, 'Thanks'), (3, 3, 'Nice');
";

async fn blog(server: &TestServer) -> TestResult<CreatedTenant> {
    let tenant = server.create_tenant().await?;
    developer_sql(server, &tenant, BLOG).await?;

    Ok(tenant)
}

#[tokio::test]
async fn filters_orders_and_pages_rows() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = blog(&server).await?;
    let service = Credentials::service(&tenant);

    let popular = rest_json(
        &server,
        service,
        "/posts?select=id,title&published=is.true&views=gte.100&order=views.desc",
    )
    .await?;
    assert_eq!(
        popular,
        json!([{ "id": 3, "title": "Postgres tricks" }, { "id": 1, "title": "Rust tips" }])
    );

    let either = rest_json(
        &server,
        service,
        "/posts?select=id&or=(title.ilike.*draft*,tags.cs.{postgres})&order=id",
    )
    .await?;
    assert_eq!(either, json!([{ "id": 2 }, { "id": 3 }]));

    let listed = rest_json(&server, service, "/posts?select=id&id=in.(1,3)&id=not.eq.3").await?;
    assert_eq!(listed, json!([{ "id": 1 }]));

    let page = rest(
        &server,
        service,
        RestRequest::get("/posts?select=id&order=id&limit=2&offset=1").prefer("count=exact"),
    )
    .await?;
    let content_range = page.headers().get(CONTENT_RANGE).cloned();
    assert_eq!(
        content_range.as_ref().and_then(|value| value.to_str().ok()),
        Some("1-2/3")
    );
    let page: Value = page.json().await?;
    assert_eq!(page, json!([{ "id": 2 }, { "id": 3 }]));

    let invalid = rest(&server, service, RestRequest::get("/posts?views=eq.many")).await?;
    assert_eq!(invalid.status(), StatusCode::BAD_REQUEST);
    assert_eq!(error_code(invalid).await?, "invalid_value");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn embeds_related_rows_through_foreign_keys() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = blog(&server).await?;
    let service = Credentials::service(&tenant);

    let posts = rest_json(
        &server,
        service,
        "/posts?select=title,writer:authors(name),comments(body)&id=eq.1&comments.order=id.desc",
    )
    .await?;
    assert_eq!(
        posts,
        json!([{
            "title": "Rust tips",
            "writer": { "name": "Ana" },
            "comments": [{ "body": "Thanks" }, { "body": "Great" }]
        }])
    );

    let authors = rest_json(
        &server,
        service,
        "/authors?select=name,posts!inner(title)&posts.published=is.true&posts.views=gt.200",
    )
    .await?;
    assert_eq!(
        authors,
        json!([{ "name": "Bia", "posts": [{ "title": "Postgres tricks" }] }])
    );

    let nested = rest_json(
        &server,
        service,
        "/comments?select=body,posts(title,authors(name))&id=eq.3",
    )
    .await?;
    assert_eq!(
        nested,
        json!([{ "body": "Nice", "posts": { "title": "Postgres tricks", "authors": { "name": "Bia" } } }])
    );

    let unrelated = rest(
        &server,
        service,
        RestRequest::get("/authors?select=comments(id)"),
    )
    .await?;
    assert_eq!(unrelated.status(), StatusCode::BAD_REQUEST);
    assert_eq!(error_code(unrelated).await?, "relationship_not_found");

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn answers_a_single_object_when_asked() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = blog(&server).await?;
    let service = Credentials::service(&tenant);
    let single = |path: &'static str| {
        server
            .client
            .get(server.url(&format!("/rest/v1{path}")))
            .header("apikey", &tenant.secret_key)
            .header("accept", "application/vnd.pgrst.object+json")
            .send()
    };

    let author: Value = single("/authors?id=eq.2")
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(author, json!({ "id": 2, "name": "Bia" }));

    let many = single("/authors").await?;
    assert_eq!(many.status(), StatusCode::NOT_ACCEPTABLE);
    assert_eq!(error_code(many).await?, "not_single_row");

    let schema_changed = rest(&server, service, RestRequest::get("/tags")).await?;
    assert_eq!(schema_changed.status(), StatusCode::NOT_FOUND);
    developer_sql(
        &server,
        &tenant,
        "CREATE TABLE tags (name TEXT PRIMARY KEY);",
    )
    .await?;
    assert_eq!(rest_json(&server, service, "/tags").await?, json!([]));

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn embeds_many_to_many_through_a_linking_table() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = blog(&server).await?;
    developer_sql(
        &server,
        &tenant,
        "CREATE TABLE tags (id INT PRIMARY KEY, name TEXT NOT NULL);
         CREATE TABLE post_tags (
             post_id INT REFERENCES posts (id),
             tag_id INT REFERENCES tags (id),
             PRIMARY KEY (post_id, tag_id)
         );
         INSERT INTO tags VALUES (1, 'rust'), (2, 'web'), (3, 'sql');
         INSERT INTO post_tags VALUES (1, 1), (1, 2), (3, 3);",
    )
    .await?;
    let service = Credentials::service(&tenant);

    let posts = rest_json(
        &server,
        service,
        "/posts?select=id,tags(name)&order=id&tags.order=name&id=in.(1,2)",
    )
    .await?;
    assert_eq!(
        posts,
        json!([
            { "id": 1, "tags": [{ "name": "rust" }, { "name": "web" }] },
            { "id": 2, "tags": [] }
        ])
    );

    let tagged = rest_json(
        &server,
        service,
        "/tags?select=name,posts!inner(title)&order=id",
    )
    .await?;
    assert_eq!(
        tagged,
        json!([
            { "name": "rust", "posts": [{ "title": "Rust tips" }] },
            { "name": "web", "posts": [{ "title": "Rust tips" }] },
            { "name": "sql", "posts": [{ "title": "Postgres tricks" }] }
        ])
    );

    server.drop_tenant(&tenant).await
}
