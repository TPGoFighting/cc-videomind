//! `ai_proxy` — forward an HTTP request to the AI base URL from Rust.
//!
//! Why this lives in Rust and not the browser: the longcat API does not send
//! `Access-Control-Allow-Origin`, so a browser fetch is blocked by CORS. The key
//! is read from the secure store (never shipped to the frontend JS), and the
//! target base URL comes from the `AI_API_BASE_URL` env var. The frontend only
//! ever calls `ai_proxy(method, path, headers, body)` and gets the raw response
//! text back.

/// Auth header name for the API key. Defaults to `Authorization` (Bearer).
const ENV_KEY_HEADER: &str = "AI_API_KEY_HEADER";
/// Prefix prepended to the key value, e.g. `Bearer ` or empty for `x-api-key`.
const ENV_KEY_PREFIX: &str = "AI_API_KEY_PREFIX";

/// Forward a request to `<AI_API_BASE_URL><path>`.
///
/// * `headers` are forwarded as-is (content-type, anthropic-version, etc.).
/// * The API key is injected from the secure store under `AI_API_KEY` using the
///   configurable header/prefix (see ENV_* above), so the frontend never sees it.
pub async fn proxy(
    base_url: &str,
    api_key: &str,
    method: &str,
    path: &str,
    headers: &[(String, String)],
    body: Option<String>,
) -> Result<String, String> {
    if base_url.is_empty() {
        return Err("AI_API_BASE_URL is not configured".to_string());
    }

    let url = format!("{}{}", base_url.trim_end_matches('/'), path);
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

    let method_up = method.to_uppercase();
    let mut req = match method_up.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        "HEAD" => client.head(&url),
        other => return Err(format!("unsupported HTTP method: {other}")),
    };

    for (k, v) in headers {
        req = req.header(k, v);
    }

    if !api_key.is_empty() {
        let header_name =
            std::env::var(ENV_KEY_HEADER).unwrap_or_else(|_| "Authorization".to_string());
        let prefix = std::env::var(ENV_KEY_PREFIX).unwrap_or_else(|_| "Bearer ".to_string());
        let value = format!("{}{}", prefix, api_key);
        req = req.header(header_name, value);
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("AI proxy HTTP {}: {}", status, text));
    }
    Ok(text)
}
