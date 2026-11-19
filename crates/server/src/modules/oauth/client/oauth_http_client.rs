use oauth_providers::{BoxError, BoxFuture, HttpClient, HttpRequest, HttpResponse};
use reqwest::header::CONTENT_TYPE;

#[derive(Debug, thiserror::Error)]
#[error("expected a JSON OAuth token response")]
struct InvalidTokenContentType;

/// Reuses the application's timeout and redirect policy for requests carrying credentials.
pub struct OAuthHttpClient {
    client: reqwest::Client,
}

impl OAuthHttpClient {
    pub fn new(client: reqwest::Client) -> Self {
        Self { client }
    }
}

impl HttpClient for OAuthHttpClient {
    fn send(&self, request: HttpRequest) -> BoxFuture<'_, Result<HttpResponse, BoxError>> {
        Box::pin(send_oauth_request(&self.client, request))
    }
}

async fn send_oauth_request(
    client: &reqwest::Client,
    request: HttpRequest,
) -> Result<HttpResponse, BoxError> {
    let method = reqwest::Method::from_bytes(request.method.as_bytes())?;
    let mut builder = client.request(method, request.url);

    for (name, value) in request.headers {
        builder = builder.header(name, value);
    }

    let response = builder.body(request.body).send().await?;

    if let Some(content_type) = response.headers().get(CONTENT_TYPE)
        && content_type
            .to_str()
            .is_ok_and(|value| value.to_ascii_lowercase().starts_with("application/json"))
            == false
    {
        return Err(InvalidTokenContentType.into());
    }

    let status = response.status().as_u16();
    let body = response.bytes().await?.to_vec();

    Ok(HttpResponse { status, body })
}

#[cfg(test)]
mod tests {
    use super::*;
    use url::Url;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn rejects_token_responses_that_declare_a_non_json_content_type() -> Result<(), BoxError>
    {
        let server = MockServer::start().await;
        let client = OAuthHttpClient::new(reqwest::Client::new());

        for (endpoint, response, should_accept) in [
            ("/no-type", ResponseTemplate::new(200), true),
            (
                "/json",
                ResponseTemplate::new(200)
                    .insert_header("content-type", "Application/JSON; charset=utf-8"),
                true,
            ),
            (
                "/text",
                ResponseTemplate::new(200).insert_header("content-type", "text/plain"),
                false,
            ),
        ] {
            Mock::given(method("POST"))
                .and(path(endpoint))
                .respond_with(response)
                .mount(&server)
                .await;
            let request = HttpRequest {
                method: "POST",
                url: Url::parse(&format!("{}{endpoint}", server.uri()))?,
                headers: Vec::new(),
                body: Vec::new(),
            };

            assert_eq!(client.send(request).await.is_ok(), should_accept);
        }

        Ok(())
    }
}
