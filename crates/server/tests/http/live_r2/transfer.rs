use std::collections::BTreeMap;

use axum::body::Bytes;
use reqwest::{RequestBuilder, Response, StatusCode, Url};
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

use crate::support::{CreatedTenant, TestResult, TestServer, error_code};

pub(super) struct LiveTransfer<'a> {
    pub server: &'a TestServer,
    pub tenant: &'a CreatedTenant,
    pub endpoint: &'a Url,
    pub upload_route: String,
    pub payload: Bytes,
}

#[derive(Deserialize)]
struct Upload {
    object_id: Uuid,
    url: String,
    headers: BTreeMap<String, String>,
}

#[derive(Deserialize)]
struct Download {
    url: String,
}

impl LiveTransfer<'_> {
    pub async fn check_preconditions(&self) -> TestResult {
        let upload = self.reserve("preflight.bin".to_owned()).await?;
        let rejected = self
            .put_request(&upload, Bytes::from_static(b"short"))?
            .send()
            .await
            .map_err(reqwest::Error::without_url)?;

        if rejected.status().is_client_error() == false {
            return Err("r2 PUT accepted a different content length".into());
        }

        let missing = self
            .object_request(upload.object_id, "complete")
            .send()
            .await
            .map_err(reqwest::Error::without_url)?;

        if missing.status() != StatusCode::CONFLICT
            || error_code(missing).await? != "storage_upload_missing"
        {
            return Err("api complete did not reject the missing staging upload".into());
        }

        self.put(&upload).await?;
        let replayed = self
            .put_request(&upload, self.payload.clone())?
            .send()
            .await
            .map_err(reqwest::Error::without_url)?;

        if replayed.status() != StatusCode::PRECONDITION_FAILED {
            return Err("r2 PUT did not reject a second write to the same key".into());
        }

        self.complete(upload.object_id).await?;
        self.check_download(upload.object_id).await
    }

    pub async fn exercise(&self, name: String) -> TestResult<String> {
        let upload = self.reserve(name).await?;
        self.put(&upload).await?;
        self.complete(upload.object_id).await?;
        self.check_download(upload.object_id).await?;

        Ok("completed".to_owned())
    }

    async fn reserve(&self, name: String) -> TestResult<Upload> {
        let request = self
            .server
            .client
            .post(&self.upload_route)
            .header("apikey", &self.tenant.secret_key)
            .json(&json!({
                "name": name,
                "size_bytes": self.payload.len(),
                "content_type": "application/octet-stream"
            }));
        let response = send("api reserve", request).await?;

        Ok(response.json().await.map_err(reqwest::Error::without_url)?)
    }

    async fn put(&self, upload: &Upload) -> TestResult {
        send("r2 PUT", self.put_request(upload, self.payload.clone())?).await?;

        Ok(())
    }

    fn put_request(&self, upload: &Upload, bytes: Bytes) -> TestResult<RequestBuilder> {
        let url = signed_url(&upload.url, self.endpoint)?;
        let mut request = self.server.client.put(url).body(bytes);

        for (name, value) in &upload.headers {
            if name != "content-length" {
                request = request.header(name, value);
            }
        }

        Ok(request)
    }

    async fn complete(&self, id: Uuid) -> TestResult {
        let request = self.object_request(id, "complete");
        send("api complete (R2 HEAD)", request).await?;

        Ok(())
    }

    async fn check_download(&self, id: Uuid) -> TestResult {
        let request = self.object_request(id, "download-url");
        let response = send("api sign download", request).await?;
        let signed = response
            .json::<Download>()
            .await
            .map_err(reqwest::Error::without_url)?;
        let url = signed_url(&signed.url, self.endpoint)?;
        let download = send("r2 GET", self.server.client.get(url)).await?;
        let bytes = download
            .bytes()
            .await
            .map_err(reqwest::Error::without_url)?;

        if bytes != self.payload {
            return Err("r2 GET: downloaded bytes differ from the upload".into());
        }

        Ok(())
    }

    fn object_request(&self, id: Uuid, action: &str) -> RequestBuilder {
        let route = self
            .server
            .url(&format!("/storage/v1/objects/{id}/{action}"));
        self.server
            .client
            .post(route)
            .header("apikey", &self.tenant.secret_key)
    }
}

fn signed_url(raw: &str, endpoint: &Url) -> TestResult<Url> {
    let url = Url::parse(raw).map_err(|_| "invalid signed URL")?;

    if url.origin() != endpoint.origin() {
        return Err("signed URL points outside the configured staging origin".into());
    }

    Ok(url)
}

async fn send(stage: &str, request: RequestBuilder) -> TestResult<Response> {
    let response = request
        .send()
        .await
        .map_err(|error| format!("{stage}: {}", error.without_url()))?;
    let status = response.status();

    if status.is_success() {
        return Ok(response);
    }

    let body = response.text().await.map_err(reqwest::Error::without_url)?;
    let parsed = serde_json::from_str::<Value>(&body).unwrap_or(Value::Null);
    let code = parsed
        .get("error")
        .and_then(Value::as_str)
        .or_else(|| {
            body.split_once("<Code>")?
                .1
                .split_once("</Code>")
                .map(|(code, _)| code)
        })
        .filter(|code| {
            code.len() <= 64
                && code
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
        })
        .unwrap_or("unknown");

    Err(format!("{stage}: {} {code}", status.as_u16()).into())
}
