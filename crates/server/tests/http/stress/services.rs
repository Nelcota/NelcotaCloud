use std::time::{Duration, Instant};

use reqwest::{Method, Response};
use serde_json::{Value, json};

use super::metrics::{Load, exercise, status};
use crate::cache::support::{CACHE_KEY, CacheProject, cache_request};
use crate::database::support::{Credentials, RestRequest, developer_sql, rest, rest_json};
use crate::storage::mock_storage;
use crate::support::{
    CreatedTenant, Session, TEST_PASSWORD, TestResult, TestServer, field, unique_email,
};
use crate::webhooks::receiver::{WebhookReceiver, create_endpoint, has_valid_signature, header};

const READ_QUERY: &str = "/stress_rows?select=id,label&order=id&limit=20";
const CACHE_VALUE: &str = "stress-fixture";

pub async fn exercise_services() -> TestResult {
    let provider = mock_storage().await;
    let mut server = TestServer::start_with_storage(provider.uri()).await?;
    server.start_worker().await?;
    let (platform, owner) = server
        .create_platform_account(&unique_email("stress-owner"))
        .await?;
    let cache = CacheProject::create(&server, &owner).await?;
    let tenant = &cache.project;
    server
        .client
        .patch(server.url("/auth/v1/admin/settings"))
        .header("apikey", &tenant.secret_key)
        .json(&json!({ "require_email_verification": false }))
        .send()
        .await?
        .error_for_status()?;
    let actor = server.sign_up(tenant, &unique_email("stress-user")).await?;
    let token = seed_cache(&cache).await?;
    let work = Workload {
        server: &server,
        tenant,
        actor: &actor,
        cache_token: &token,
    };
    create_table(&work).await?;

    let signups = exercise_signup(&work).await;
    let auth = exercise_login(&work).await;
    let writes = exercise_writes(&work).await;
    let reads = exercise_reads(&work).await;
    let cache_reads = exercise_cache(&work).await;
    let webhooks = exercise_webhooks(&work).await;
    cache.drop().await?;
    server.drop_tenant(&platform).await?;

    signups?;
    auth?;
    writes?;
    reads?;
    cache_reads?;
    webhooks
}

struct Workload<'a> {
    server: &'a TestServer,
    tenant: &'a CreatedTenant,
    actor: &'a Session,
    cache_token: &'a str,
}

async fn seed_cache(project: &CacheProject<'_>) -> TestResult<String> {
    project.set_enabled(true).await?;
    let credential = project.issue().await?;
    let body = json!({ "key": CACHE_KEY, "value": CACHE_VALUE, "ttl_seconds": 600 });
    cache_request(project.server, &credential.token, ("set", body))
        .await?
        .error_for_status()?;

    Ok(credential.token)
}

async fn create_table(work: &Workload<'_>) -> TestResult {
    developer_sql(
        work.server,
        work.tenant,
        "CREATE TABLE public.stress_rows (id int PRIMARY KEY, label text NOT NULL)",
    )
    .await
}

async fn exercise_signup(work: &Workload<'_>) -> TestResult {
    let report = exercise("auth-signup", Load::burst(6, 6), async |_| {
        let body = json!({
            "email": unique_email("stress-signup"),
            "password": TEST_PASSWORD.as_str()
        });
        let response = work
            .server
            .post_auth("/auth/v1/signup", &work.tenant.publishable_key, body)
            .await?;

        status(response).await
    })
    .await?;

    report.require(&[("201", 6)])
}

async fn exercise_login(work: &Workload<'_>) -> TestResult {
    let report = exercise("auth-password", Load::burst(24, 24), async |_| {
        let body = json!({ "email": work.actor.user.email, "password": TEST_PASSWORD.as_str() });
        let response = work
            .server
            .post_auth("/auth/v1/login", &work.tenant.publishable_key, body)
            .await?;

        status(response).await
    })
    .await?;

    report.require_only(&["200", "429 too_many_requests"])?;
    assert!(report.count("200") >= 10);
    assert!(report.count("429 too_many_requests") > 0);

    Ok(())
}

async fn exercise_writes(work: &Workload<'_>) -> TestResult {
    let report = exercise("database-insert", Load::burst(240, 64), async |index| {
        let body = json!({ "id": index, "label": format!("row-{index}") });
        let request = RestRequest::with_body(Method::POST, "/stress_rows", body);
        let response = rest(work.server, Credentials::service(work.tenant), request).await?;

        status(response).await
    })
    .await?;
    let rows = rest_json(
        work.server,
        Credentials::service(work.tenant),
        "/stress_rows?select=id",
    )
    .await?;
    assert_eq!(
        rows.as_array().ok_or("invalid rows")?.len(),
        report.count("201")
    );

    report.require(&[("201", 240)])
}

async fn exercise_reads(work: &Workload<'_>) -> TestResult {
    let mut result = Ok(());

    for (name, load, minimum_successes) in [
        ("mixed-warmup", Load::burst(64, 8), 64),
        ("mixed-burst", Load::burst(1024, 128), 800),
        (
            "mixed-sustained",
            Load {
                count: 30_000,
                concurrency: 64,
                interval: Duration::from_millis(4),
            },
            29_990,
        ),
    ] {
        let report = exercise(name, load, async |index| {
            status(read(work, index).await?).await
        })
        .await?;

        if let Err(error) = report.require_only(&["200", "429 too_many_requests"]) {
            result = Err(error);
        }

        if report.count("200") < minimum_successes {
            result = Err(format!(
                "{name} returned fewer than {minimum_successes} successful responses"
            )
            .into());
        }
    }

    result
}

async fn read(work: &Workload<'_>, index: usize) -> TestResult<Response> {
    let server = work.server;
    let tenant = work.tenant;

    match index % 5 {
        0 => Ok(server.client.get(server.url("/ready")).send().await?),
        1 => {
            server
                .current_user(&tenant.publishable_key, &work.actor.access_token)
                .await
        }
        2 => {
            rest(
                server,
                Credentials::service(tenant),
                RestRequest::get(READ_QUERY),
            )
            .await
        }
        3 => Ok(server
            .client
            .get(server.url("/storage/v1/buckets"))
            .header("apikey", &tenant.secret_key)
            .send()
            .await?),
        _ => {
            cache_request(
                server,
                work.cache_token,
                ("get", json!({ "key": CACHE_KEY })),
            )
            .await
        }
    }
}

async fn exercise_cache(work: &Workload<'_>) -> TestResult {
    let report = exercise("cache-backpressure", Load::burst(480, 96), async |_| {
        let response = cache_request(
            work.server,
            work.cache_token,
            ("get", json!({ "key": CACHE_KEY })),
        )
        .await?;

        if response.status().is_success() {
            let body = response.json::<Value>().await?;
            assert_eq!(field(&body, "/value"), CACHE_VALUE);

            return Ok("200".to_owned());
        }

        status(response).await
    })
    .await?;
    report.require_only(&["200", "429 too_many_requests"])?;
    assert!(report.count("200") > 0);
    assert!(report.count("429 too_many_requests") > 0);

    Ok(())
}

async fn exercise_webhooks(work: &Workload<'_>) -> TestResult {
    let receiver = WebhookReceiver::answering(204).await;
    let (_, secret) = create_endpoint(
        work.server,
        work.tenant,
        (&receiver.url(), &["user.updated"]),
    )
    .await?;
    let started = Instant::now();
    let count = 20;
    let report = exercise(
        "webhook-enqueue",
        Load::burst(count, count),
        async |index| {
            let response = work
                .server
                .client
                .patch(work.server.url("/auth/v1/user"))
                .header("apikey", &work.tenant.publishable_key)
                .bearer_auth(&work.actor.access_token)
                .json(&json!({ "user_metadata": { "index": index } }))
                .send()
                .await?;

            status(response).await
        },
    )
    .await?;
    report.require(&[("200", count)])?;
    let requests = receiver.wait_for(count).await?;
    let mut ids = std::collections::BTreeSet::new();

    for request in &requests {
        assert!(has_valid_signature(request, &secret)?);
        assert!(ids.insert(header(request, "webhook-id")?));
    }

    assert_eq!(ids.len(), count);
    super::metrics::report_elapsed("webhook-drain", count, started)
}
