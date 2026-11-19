use reqwest::{StatusCode, Url};
use serde_json::{Value, json};
use tokio::io::copy_bidirectional;
use tokio::net::{TcpListener, TcpStream};

use super::support::{CACHE_KEY, CacheProject, cache_request};
use crate::support::{TestResult, TestServer, error_code, unique_email};

#[tokio::test]
async fn losing_valkey_returns_unavailable_and_leaves_auth_and_data_api_operational() -> TestResult
{
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
