use reqwest::StatusCode;
use serde_json::{Value, json};

use crate::support::{CreatedTenant, TEST_PASSWORD, TestResult, TestServer, field, unique_email};

const TEST_USER_AGENT: &str = "nelcota-tests/1.0";

async fn events_of_kind(
    server: &TestServer,
    tenant: &CreatedTenant,
    kind: &str,
) -> TestResult<Value> {
    let path = format!("/auth/v1/admin/audit-events?kind={kind}");
    let response = server
        .client
        .get(server.url(&path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response.error_for_status()?.json().await?)
}

fn actions(page: &Value) -> Vec<String> {
    let events = field(page, "/events")
        .as_array()
        .cloned()
        .unwrap_or_default();

    events
        .iter()
        .map(|event| {
            field(event, "/action")
                .as_str()
                .unwrap_or_default()
                .to_owned()
        })
        .collect()
}

async fn log_out(server: &TestServer, tenant: &CreatedTenant, refresh_token: &str) -> TestResult {
    let response = server
        .client
        .post(server.url("/auth/v1/logout"))
        .header("apikey", &tenant.publishable_key)
        .header("user-agent", TEST_USER_AGENT)
        .json(&json!({ "refresh_token": refresh_token }))
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    Ok(())
}

#[tokio::test]
async fn records_the_account_life_and_a_reused_refresh_token() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let email = unique_email("audit-life");
    let first = server.sign_up(&tenant, &email).await?;
    let login = json!({ "email": email, "password": TEST_PASSWORD.as_str() });
    let second: Value = server
        .post_auth("/auth/v1/login", &tenant.publishable_key, login)
        .await?
        .error_for_status()?
        .json()
        .await?;
    let second_refresh = field(&second, "/refresh_token")
        .as_str()
        .ok_or("refresh token")?;

    let renewed = server.refresh(&tenant, &first.refresh_token).await?;
    assert_eq!(renewed.status(), StatusCode::OK);
    let reused = server.refresh(&tenant, &first.refresh_token).await?;
    assert_eq!(reused.status(), StatusCode::UNAUTHORIZED);
    log_out(&server, &tenant, second_refresh).await?;
    // An unknown token still answers 204 but ends no session, so nothing is recorded.
    log_out(&server, &tenant, "not-a-token").await?;

    let account = events_of_kind(&server, &tenant, "account").await?;
    assert_eq!(actions(&account), ["logged_out", "signed_up"]);
    let logged_out = field(&account, "/events/0");
    assert_eq!(field(logged_out, "/user_id"), &json!(first.user.id));
    assert_eq!(field(logged_out, "/user_agent"), TEST_USER_AGENT);
    assert!(field(logged_out, "/request_id").is_string());

    let security = events_of_kind(&server, &tenant, "security").await?;
    assert_eq!(actions(&security), ["refresh_token_reused"]);
    assert_eq!(field(&security, "/events/0/user_id"), &json!(first.user.id));
    assert_eq!(
        field(&security, "/events/0/ip_address"),
        server.client_ip.to_string().as_str()
    );

    let logins = events_of_kind(&server, &tenant, "logins").await?;
    assert_eq!(actions(&logins), ["logged_in"]);
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn records_project_changes_with_who_made_them() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let created: Value = server
        .client
        .post(server.url("/auth/v1/admin/api-keys"))
        .header("apikey", &tenant.secret_key)
        .json(&json!({ "kind": "publishable", "name": "App iOS" }))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let key_id = field(&created, "/id").clone();
    let revoke_path = format!(
        "/auth/v1/admin/api-keys/{}",
        key_id.as_str().ok_or("key id")?
    );
    let revoked = server
        .client
        .delete(server.url(&revoke_path))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    assert_eq!(revoked.status(), StatusCode::NO_CONTENT);

    let project = events_of_kind(&server, &tenant, "project").await?;
    assert_eq!(actions(&project), ["api_key_revoked", "api_key_created"]);
    let created_event = field(&project, "/events/1");
    assert_eq!(field(created_event, "/actor"), "secret_key");
    assert_eq!(field(created_event, "/user_id"), &Value::Null);
    assert_eq!(field(created_event, "/details/name"), "App iOS");
    assert_eq!(field(created_event, "/details/kind"), "publishable");
    assert_eq!(field(created_event, "/details/key_id"), &key_id);
    // The new key itself is never stored in the log.
    let issued_key = field(&created, "/key").as_str().ok_or("issued key")?;
    assert!(created_event.to_string().contains(issued_key) == false);
    assert_eq!(field(&project, "/events/0/details/key_id"), &key_id);

    let changes = events_of_kind(&server, &tenant, "changes").await?;
    assert_eq!(actions(&changes), Vec::<String>::new());
    server.drop_tenant(&tenant).await
}
