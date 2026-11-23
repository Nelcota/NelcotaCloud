use std::time::Duration;

use reqwest::{StatusCode, Url};
use serde_json::{Value, json};
use sqlx::Connection;
use tokio::io::copy_bidirectional;
use tokio::net::{TcpListener, TcpStream};
use tokio::time::timeout;

use super::support::{CACHE_KEY, CREDENTIAL_QUERY_TESTS, CacheProject, cache_request};
use crate::support::{TestResult, TestServer, error_code, unique_email};

#[tokio::test]
async fn a_slow_credential_query_returns_unavailable_within_the_sdk_deadline() -> TestResult {
    let _guard = CREDENTIAL_QUERY_TESTS.write().await;
    let server = TestServer::start().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("cache-query-timeout"))
        .await?;
    let project = CacheProject::create(&server, &owner).await?;
    project.set_enabled(true).await?;
    let credential = project.issue().await?;
    let entry = json!({ "key": CACHE_KEY, "value": "cached value" });
    cache_request(&server, &credential.token, ("set", entry))
        .await?
        .error_for_status()?;

    let mut database = server.control_plane().await?;
    let mut transaction = database.begin().await?;
    sqlx::query("LOCK TABLE project_cache_credentials IN ACCESS EXCLUSIVE MODE")
        .execute(&mut *transaction)
        .await?;
    let request = ("get", json!({ "key": CACHE_KEY }));
    let response = timeout(
        Duration::from_millis(1_500),
        cache_request(&server, &credential.token, request.clone()),
    )
    .await;
    transaction.rollback().await?;

    let response = response??;
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(error_code(response).await?, "cache_unavailable");
    let recovered = cache_request(&server, &credential.token, request)
        .await?
        .error_for_status()?;
    assert_eq!(
        recovered.json::<Value>().await?,
        json!({ "value": "cached value" })
    );

    project.drop().await?;
    server.drop_tenant(&platform).await
}

#[tokio::test]
async fn losing_valkey_returns_unavailable_and_leaves_auth_and_data_api_operational() -> TestResult
{
    let _guard = CREDENTIAL_QUERY_TESTS.read().await;
    let mut proxy_url = Url::parse(&dotenvy::var("CACHE_VALKEY_URL")?)?;
    let host = proxy_url
        .host_str()
        .ok_or("the test Valkey URL must name a host")?;
    let upstream = (host.to_owned(), proxy_url.port().unwrap_or(6379));
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    proxy_url.set_host(Some("127.0.0.1"))?;
    proxy_url
        .set_port(Some(listener.local_addr()?.port()))
        .map_err(|()| "invalid proxy port")?;
    let mut proxy = tokio::task::JoinSet::new();
    proxy.spawn(async move {
        let (mut client, _) = listener.accept().await?;
        let mut valkey = TcpStream::connect(upstream).await?;
        copy_bidirectional(&mut client, &mut valkey).await
    });

    let server = TestServer::start_with_cache(proxy_url.to_string()).await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("cache-outage"))
        .await?;
    let project = CacheProject::create(&server, &owner).await?;
    project.set_enabled(true).await?;
    let credential = project.issue().await?;
    let entry = json!({ "key": CACHE_KEY, "value": "before outage" });
    cache_request(&server, &credential.token, ("set", entry))
        .await?
        .error_for_status()?;

    proxy.abort_all();
    let stopped = proxy.join_next().await.ok_or("missing cache proxy task")?;
    assert!(matches!(stopped, Err(error) if error.is_cancelled()));
    let response = cache_request(
        &server,
        &credential.token,
        ("get", json!({ "key": CACHE_KEY })),
    )
    .await?;
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(error_code(response).await?, "cache_unavailable");
    assert_core_api_works(&project, &platform).await?;

    project.drop().await?;
    server.drop_tenant(&platform).await
}

async fn assert_core_api_works(
    project: &CacheProject<'_>,
    platform: &crate::support::CreatedTenant,
) -> TestResult {
    let server = project.server;
    server
        .client
        .get(server.url("/ready"))
        .send()
        .await?
        .error_for_status()?;
    server
        .current_user(&platform.publishable_key, &project.owner.access_token)
        .await?
        .error_for_status()?;
    let secret_key = &project.project.secret_key;
    let query = json!({ "query": "CREATE TABLE public.cache_outage_check (id int PRIMARY KEY)" });
    server
        .client
        .post(server.url("/database/v1/sql"))
        .header("apikey", secret_key)
        .json(&query)
        .send()
        .await?
        .error_for_status()?;
    let rows: Value = server
        .client
        .get(server.url("/rest/v1/cache_outage_check"))
        .header("apikey", secret_key)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    assert_eq!(rows, json!([]));

    Ok(())
}
