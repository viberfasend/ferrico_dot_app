use reqwest::header::CONTENT_TYPE;
use reqwest::Client;

/// Upper bound on how much of a page we download while looking for cover meta
/// tags. og:image lives in <head>, so the first 256 KiB is plenty — and the cap
/// keeps a huge page from being fully buffered just to scan its <head>.
const MAX_HTML_BYTES: usize = 256 * 1024;

pub fn build_client() -> Result<Client, reqwest::Error> {
    Client::builder()
        .user_agent("Mozilla/5.0 (compatible; Ferrico/1.0; +https://ferrico.app)")
        .timeout(std::time::Duration::from_secs(15))
        .build()
}

/// Fetches the og:image or twitter:image meta tag URL from a webpage.
/// Returns None if the page can't be fetched or has no such tag.
///
/// Only text/html responses are read, and at most MAX_HTML_BYTES of the body
/// is buffered — non-HTML resources are skipped before their body is touched.
pub async fn fetch_og_image(client: &Client, url: &str) -> Option<String> {
    let mut resp = client.get(url).send().await.ok()?;

    // Skip non-HTML responses (PDFs, images, downloads) without reading the body.
    let is_html = resp
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|ct| ct.to_ascii_lowercase().contains("text/html"))
        .unwrap_or(false);
    if !is_html {
        return None;
    }

    // Read the body chunk by chunk up to the cap instead of buffering it all.
    let mut buf: Vec<u8> = Vec::new();
    while buf.len() < MAX_HTML_BYTES {
        match resp.chunk().await {
            Ok(Some(chunk)) => {
                let remaining = MAX_HTML_BYTES - buf.len();
                if chunk.len() > remaining {
                    buf.extend_from_slice(&chunk[..remaining]);
                    break;
                }
                buf.extend_from_slice(&chunk);
            }
            Ok(None) => break,
            Err(_) => return None,
        }
    }

    let html = String::from_utf8_lossy(&buf);
    let doc = scraper::Html::parse_document(&html);

    // Try og:image first, fall back to twitter:image
    for selector_str in &[
        "meta[property='og:image']",
        "meta[name='og:image']",
        "meta[name='twitter:image']",
        "meta[property='twitter:image']",
    ] {
        if let Ok(sel) = scraper::Selector::parse(selector_str) {
            if let Some(el) = doc.select(&sel).next() {
                if let Some(content) = el.value().attr("content") {
                    let trimmed = content.trim().to_string();
                    if !trimmed.is_empty() {
                        return Some(trimmed);
                    }
                }
            }
        }
    }

    None
}
