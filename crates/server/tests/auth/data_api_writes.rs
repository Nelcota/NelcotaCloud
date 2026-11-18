use reqwest::{Method, StatusCode};
use serde_json::{Value, json};

use crate::database_support::{Credentials, RestRequest, developer_sql, rest, rest_json};
use crate::support::{TestResult, TestServer, error_code};

const SHOP: &str = "
CREATE TABLE products (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0
);
CREATE TABLE orders (
    id INT PRIMARY KEY,
    sku TEXT NOT NULL REFERENCES products (sku)
);
";

#[tokio::test]
async fn inserts_upserts_updates_and_deletes_rows() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(&server, &tenant, SHOP).await?;
    let service = Credentials::service(&tenant);
    let rows = json!([
        { "sku": "a", "name": "Pen", "price": 2.5 },
        { "sku": "b", "name": "Book", "price": 30, "stock": 4 }
    ]);

    let inserted = rest(
        &server,
        service,
        RestRequest::with_body(Method::POST, "/products", rows),
    )
    .await?;
    assert_eq!(inserted.status(), StatusCode::CREATED);

    let upserted = rest(
        &server,
        service,
        RestRequest::with_body(
            Method::POST,
            "/products?select=sku,stock",
            json!({ "sku": "a", "name": "Pen", "price": 3, "stock": 9 }),
        )
        .prefer("resolution=merge-duplicates,return=representation"),
    )
    .await?;
    assert_eq!(upserted.status(), StatusCode::CREATED);
    let upserted: Value = upserted.json().await?;
    assert_eq!(upserted, json!([{ "sku": "a", "stock": 9 }]));

    let updated = rest(
        &server,
        service,
        RestRequest::with_body(
            Method::PATCH,
            "/products?sku=eq.b&select=stock",
            json!({ "stock": 1 }),
        )
        .prefer("return=representation"),
    )
    .await?;
    assert_eq!(updated.status(), StatusCode::OK);
    let updated: Value = updated.json().await?;
    assert_eq!(updated, json!([{ "stock": 1 }]));

    let deleted = rest(
        &server,
        service,
        RestRequest {
            method: Method::DELETE,
            path: "/products?sku=eq.a",
            body: None,
            prefer: None,
        },
    )
    .await?;
    assert_eq!(deleted.status(), StatusCode::NO_CONTENT);
    let remaining = rest_json(&server, service, "/products?select=sku").await?;
    assert_eq!(remaining, json!([{ "sku": "b" }]));

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_unsafe_or_invalid_writes() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(&server, &tenant, SHOP).await?;
    developer_sql(
        &server,
        &tenant,
        "INSERT INTO products VALUES ('a', 'Pen', 1, 0);",
    )
    .await?;
    let service = Credentials::service(&tenant);
    let post = |body: Value| RestRequest::with_body(Method::POST, "/products", body);
    let cases = [
        (
            post(json!({ "sku": "a", "name": "Again", "price": 1 })),
            StatusCode::CONFLICT,
            "unique_violation",
        ),
        (
            post(json!({ "sku": "c", "price": 1 })),
            StatusCode::BAD_REQUEST,
            "not_null_violation",
        ),
        (
            post(json!({ "sku": "c", "name": "Bad", "price": -1 })),
            StatusCode::BAD_REQUEST,
            "check_violation",
        ),
        (
            post(json!({ "sku": "c", "colour": "red" })),
            StatusCode::BAD_REQUEST,
            "column_not_found",
        ),
        (
            RestRequest::with_body(Method::POST, "/orders", json!({ "id": 1, "sku": "zzz" })),
            StatusCode::CONFLICT,
            "foreign_key_violation",
        ),
        (
            RestRequest::with_body(Method::PATCH, "/products", json!({ "stock": 0 })),
            StatusCode::BAD_REQUEST,
            "filter_required",
        ),
        (
            RestRequest {
                method: Method::DELETE,
                path: "/products",
                body: None,
                prefer: None,
            },
            StatusCode::BAD_REQUEST,
            "filter_required",
        ),
    ];

    for (request, status, code) in cases {
        let response = rest(&server, service, request).await?;
        assert_eq!(response.status(), status, "{code}");
        assert_eq!(error_code(response).await?, code);
    }

    let untouched = rest_json(&server, service, "/products?select=sku,stock").await?;
    assert_eq!(untouched, json!([{ "sku": "a", "stock": 0 }]));

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn writes_answer_objects_run_batches_in_order_and_refuse_paging() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(&server, &tenant, SHOP).await?;
    developer_sql(
        &server,
        &tenant,
        "CREATE TABLE codes (code CHAR(5) PRIMARY KEY, label TEXT);",
    )
    .await?;
    let service = Credentials::service(&tenant);

    let single = server
        .client
        .post(server.url("/rest/v1/products?select=sku"))
        .header("apikey", &tenant.secret_key)
        .header("prefer", "return=representation")
        .header("accept", "application/vnd.pgrst.object+json")
        .json(&json!({ "sku": "a", "name": "Pen", "price": 1 }))
        .send()
        .await?;
    assert_eq!(single.status(), StatusCode::CREATED);
    let single: Value = single.json().await?;
    assert_eq!(single, json!({ "sku": "a" }));

    // Rows setting different columns run in order, so the second merges into the first.
    let upserted = rest(
        &server,
        service,
        RestRequest::with_body(
            Method::POST,
            "/products?select=sku,stock",
            json!([
                { "sku": "b", "name": "Book", "price": 3 },
                { "sku": "b", "name": "Book", "price": 3, "stock": 7 }
            ]),
        )
        .prefer("resolution=merge-duplicates,return=representation"),
    )
    .await?;
    assert_eq!(upserted.status(), StatusCode::CREATED);
    let stock = rest_json(&server, service, "/products?select=stock&sku=eq.b").await?;
    assert_eq!(stock, json!([{ "stock": 7 }]));

    let paged = rest(
        &server,
        service,
        RestRequest::with_body(
            Method::PATCH,
            "/products?sku=eq.a&limit=1",
            json!({ "stock": 1 }),
        ),
    )
    .await?;
    assert_eq!(paged.status(), StatusCode::BAD_REQUEST);

    developer_sql(
        &server,
        &tenant,
        "INSERT INTO codes VALUES ('ab', 'short');",
    )
    .await?;
    let padded = rest_json(&server, service, "/codes?select=label&code=eq.ab").await?;
    assert_eq!(padded, json!([{ "label": "short" }]));

    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn oversized_combined_write_result_rolls_back_all_batches() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    developer_sql(
        &server,
        &tenant,
        "CREATE TABLE documents (
            id integer PRIMARY KEY,
            label text DEFAULT 'default',
            content text NOT NULL DEFAULT repeat('x', 9000000)
        )",
    )
    .await?;

    let credentials = Credentials::service(&tenant);
    let response = rest(
        &server,
        credentials,
        RestRequest::with_body(
            Method::POST,
            "/documents",
            json!([
                { "id": 1 },
                { "id": 2, "label": "explicit" }
            ]),
        )
        .prefer("return=representation"),
    )
    .await?;

    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(error_code(response).await?, "response_too_large");
    let rows = rest_json(&server, credentials, "/documents?select=id").await?;
    assert_eq!(rows, json!([]));
    server.drop_tenant(&tenant).await
}
