use std::future::Future;
use std::pin::Pin;

use oauth2::{AsyncHttpClient, HttpRequest, HttpResponse};

/// Sends oauth2's requests through our reqwest client (oauth2 itself is built without an HTTP
/// client, which avoids pulling a second reqwest version). A named type with an explicitly
/// `Send` future is needed: a closure makes the token exchange future non-Send for axum.
pub struct OAuthHttpClient {
    client: reqwest::Client,
}

impl OAuthHttpClient {
    pub fn new(client: reqwest::Client) -> Self {
        Self { client }
    }
}

type ResponseFuture<'c> =
    Pin<Box<dyn Future<Output = Result<HttpResponse, reqwest::Error>> + Send + 'c>>;

impl<'c> AsyncHttpClient<'c> for OAuthHttpClient {
    type Error = reqwest::Error;
    type Future = ResponseFuture<'c>;

    fn call(&'c self, request: HttpRequest) -> Self::Future {
        Box::pin(send_oauth_request(&self.client, request))
    }
}

async fn send_oauth_request(
    client: &reqwest::Client,
    request: HttpRequest,
) -> Result<HttpResponse, reqwest::Error> {
    let reqwest_request = reqwest::Request::try_from(request)?;
    let mut response = client.execute(reqwest_request).await?;
    let status = response.status();
    // Taken, not cloned: the body read below consumes the response anyway.
    let headers = std::mem::take(response.headers_mut());
    let body = Vec::from(response.bytes().await?);
    let mut http_response = HttpResponse::new(body);
    *http_response.status_mut() = status;
    *http_response.headers_mut() = headers;

    Ok(http_response)
}
