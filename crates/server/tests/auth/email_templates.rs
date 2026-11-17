use reqwest::{Response, StatusCode};
use serde_json::{Value, json};

use crate::support::{CreatedTenant, TestResult, TestServer, field, unique_email};

const TEMPLATES_PATH: &str = "/auth/v1/admin/email-templates";

fn portuguese_magic_link() -> Value {
    json!({
        "subject": "Seu link de acesso ao {app_name}",
        "heading": "Entrar no {app_name}",
        "message": "Abra o link para entrar no {app_name}.\nNão precisa de senha.",
        "action_label": "Entrar",
        "note": "O link vale por 15 minutos."
    })
}

fn magic_link_with(field: &str, value: Value) -> Value {
    let mut body = portuguese_magic_link();

    if let Some(object) = body.as_object_mut() {
        object.insert(field.to_owned(), value);
    }

    body
}

async fn put_template(
    server: &TestServer,
    (tenant, kind): (&CreatedTenant, &str),
    body: Value,
) -> TestResult<Response> {
    let response = server
        .client
        .put(server.url(&format!("{TEMPLATES_PATH}/{kind}")))
        .header("apikey", &tenant.secret_key)
        .json(&body)
        .send()
        .await?;

    Ok(response)
}

async fn list_templates(server: &TestServer, tenant: &CreatedTenant) -> TestResult<Value> {
    let response = server
        .client
        .get(server.url(TEMPLATES_PATH))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;

    Ok(response.error_for_status()?.json().await?)
}

#[tokio::test]
async fn lists_the_default_wording_of_every_email() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;

    let templates = list_templates(&server, &tenant).await?;

    let kinds: Vec<&Value> = (0..3)
        .map(|index| field(&templates, &format!("/{index}/kind")))
        .collect();
    assert_eq!(
        kinds,
        [
            &json!("verification"),
            &json!("password_reset"),
            &json!("magic_link")
        ]
    );
    assert_eq!(field(&templates, "/0/is_customized"), false);
    assert_eq!(
        field(&templates, "/0/text"),
        field(&templates, "/0/default_text")
    );
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn sends_the_projects_own_wording_until_reset() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let saved = put_template(&server, (&tenant, "magic_link"), portuguese_magic_link()).await?;
    assert_eq!(saved.status(), StatusCode::OK);
    let saved: Value = saved.json().await?;
    assert_eq!(field(&saved, "/is_customized"), true);
    assert_eq!(field(&saved, "/text/action_label"), "Entrar");

    let email = unique_email("template");
    let body = json!({ "email": email });
    let sent = server
        .post_auth("/auth/v1/magic-link", &tenant.publishable_key, body)
        .await?;
    assert!(sent.status().is_success());
    let text = server.wait_for_email_text(&email).await?;
    assert!(text.contains("Abra o link para entrar no "), "{text}");
    assert!(text.contains("Entrar: http"), "{text}");
    assert!(text.contains("{app_name}") == false, "{text}");

    let reset = server
        .client
        .delete(server.url(&format!("{TEMPLATES_PATH}/magic_link")))
        .header("apikey", &tenant.secret_key)
        .send()
        .await?;
    let reset: Value = reset.error_for_status()?.json().await?;
    assert_eq!(field(&reset, "/is_customized"), false);
    assert_eq!(field(&reset, "/text/action_label"), "Log in");
    server.drop_tenant(&tenant).await
}

#[tokio::test]
async fn refuses_invalid_templates() -> TestResult {
    let server = TestServer::start().await?;
    let tenant = server.create_tenant().await?;
    let header_injection = magic_link_with(
        "subject",
        json!(
            "Oi
Bcc: alguem@example.com"
        ),
    );
    let blank = magic_link_with("message", json!("   "));
    let with_html = magic_link_with("html", json!("<b>oi</b>"));

    for body in [header_injection, blank, with_html] {
        let response = put_template(&server, (&tenant, "magic_link"), body).await?;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    let unknown_kind = put_template(&server, (&tenant, "welcome"), portuguese_magic_link()).await?;
    assert_eq!(unknown_kind.status(), StatusCode::BAD_REQUEST);
    let publishable = server
        .client
        .get(server.url(TEMPLATES_PATH))
        .header("apikey", &tenant.publishable_key)
        .send()
        .await?;
    assert_eq!(publishable.status(), StatusCode::FORBIDDEN);
    server.drop_tenant(&tenant).await
}
