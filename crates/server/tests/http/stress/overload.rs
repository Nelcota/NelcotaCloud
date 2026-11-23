use std::time::Duration;

use reqwest::Method;
use serde_json::json;

use super::metrics::{Load, exercise, status};
use crate::database::support::{Credentials, RestRequest, developer_sql, rest};
use crate::support::{CreatedTenant, TestResult, TestServer};

const BUSY: &str = "503 database_busy";

pub async fn exercise_database() -> TestResult {
    let server = TestServer::start().await?;
    let busy = server.create_tenant().await?;
    let neighbor = server.create_tenant().await?;
    developer_sql(
        &server,
        &busy,
        "CREATE FUNCTION public.stress_slow(value integer) RETURNS integer LANGUAGE sql STABLE
         AS $$ SELECT value FROM pg_sleep(0.8) $$",
    )
    .await?;
    developer_sql(
        &server,
        &neighbor,
        "CREATE TABLE public.stress_probe (id integer PRIMARY KEY);
         INSERT INTO public.stress_probe VALUES (1)",
    )
    .await?;

    let (slow, probes) = tokio::join!(saturate(&server, &busy), probe_neighbor(&server, &neighbor));
    let result = rest(&server, Credentials::service(&busy), slow_request(1)).await?;
    assert_eq!(result.error_for_status()?.json::<u64>().await?, 1);
    server.drop_tenant(&busy).await?;
    server.drop_tenant(&neighbor).await?;

    slow?;
    probes
}

async fn saturate(server: &TestServer, tenant: &CreatedTenant) -> TestResult {
    let report = exercise("database-overload", Load::burst(64, 64), async |index| {
        let response = rest(server, Credentials::service(tenant), slow_request(index)).await?;

        status(response).await
    })
    .await?;
    report.require_only(&["200", BUSY])?;
    assert!(report.count("200") > 0);
    assert!(report.count(BUSY) > 0);

    Ok(())
}

async fn probe_neighbor(server: &TestServer, neighbor: &CreatedTenant) -> TestResult {
    tokio::time::sleep(Duration::from_millis(300)).await;
    let load = Load {
        count: 100,
        concurrency: 16,
        interval: Duration::from_millis(30),
    };
    let report = exercise("database-neighbor-and-readiness", load, async |index| {
        if index.is_multiple_of(2) {
            let ready = server.client.get(server.url("/ready")).send().await?;

            return status(ready).await;
        }

        let request = RestRequest::get("/stress_probe?select=id");
        let response = rest(server, Credentials::service(neighbor), request).await?;

        status(response).await
    })
    .await?;

    report.require(&[("200", 100)])
}

fn slow_request(index: usize) -> RestRequest<'static> {
    RestRequest::with_body(Method::POST, "/rpc/stress_slow", json!({ "value": index }))
}
