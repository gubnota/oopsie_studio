use crate::service::{err, text, NativeState, Result};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn mac(key: &[u8], message: &str) -> Vec<u8> {
    let mut k = [0u8; 64];
    let normalized = if key.len() > 64 {
        Sha256::digest(key).to_vec()
    } else {
        key.to_vec()
    };
    k[..normalized.len()].copy_from_slice(&normalized);
    let inner: Vec<u8> = k.iter().map(|b| b ^ 0x36).collect();
    let outer: Vec<u8> = k.iter().map(|b| b ^ 0x5c).collect();
    let mut h = Sha256::new();
    h.update(inner);
    h.update(message.as_bytes());
    let mut o = Sha256::new();
    o.update(outer);
    o.update(h.finalize());
    o.finalize().to_vec()
}
fn hex(v: &[u8]) -> String {
    v.iter().map(|b| format!("{b:02x}")).collect()
}
fn encode(v: &str) -> String {
    v.bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) {
                (b as char).to_string()
            } else {
                format!("%{b:02X}")
            }
        })
        .collect()
}
fn target(cfg: &Value, key: &str) -> Result<url::Url> {
    let base = crate::workflow::endpoint_url(text(cfg, "endpointUrl")?)?;
    let bucket = text(cfg, "bucketName")?;
    if bucket.len() > 63
        || !bucket
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '.')
    {
        return Err("Invalid bucket name".into());
    }
    if key.len() > 1024 || key.split('/').any(|p| p == ".." || p == ".") {
        return Err("Invalid object key".into());
    }
    let mut url = url::Url::parse(&base).map_err(err)?;
    {
        let mut path = url.path_segments_mut().map_err(|_| "Invalid endpoint")?;
        path.clear().push(bucket);
        if !key.is_empty() {
            for segment in key.split('/') {
                path.push(segment);
            }
        }
    }
    Ok(url)
}
fn signing_key(cfg: &Value, date: &str) -> Result<Vec<u8>> {
    let secret = text(cfg, "secretAccessKey")?;
    let region = cfg["region"]
        .as_str()
        .filter(|s| !s.is_empty())
        .unwrap_or("auto");
    Ok(mac(
        &mac(
            &mac(&mac(format!("AWS4{secret}").as_bytes(), date), region),
            "s3",
        ),
        "aws4_request",
    ))
}
fn canonical_query(url: &url::Url) -> String {
    let mut items: Vec<_> = url
        .query_pairs()
        .map(|(k, v)| (encode(&k), encode(&v)))
        .collect();
    items.sort();
    items
        .iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<Vec<_>>()
        .join("&")
}
fn host(url: &url::Url) -> String {
    match url.port() {
        Some(p) => format!("{}:{p}", url.host_str().unwrap_or("")),
        None => url.host_str().unwrap_or("").to_string(),
    }
}
pub fn presign(cfg: &Value, key: &str) -> Result<String> {
    let mut url = target(cfg, key)?;
    let now = chrono::Utc::now();
    let date = now.format("%Y%m%d").to_string();
    let timestamp = now.format("%Y%m%dT%H%M%SZ").to_string();
    let region = cfg["region"].as_str().unwrap_or("auto");
    let scope = format!("{date}/{region}/s3/aws4_request");
    url.query_pairs_mut()
        .append_pair("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
        .append_pair(
            "X-Amz-Credential",
            &format!("{}/{}", text(cfg, "accessKeyId")?, scope),
        )
        .append_pair("X-Amz-Date", &timestamp)
        .append_pair("X-Amz-Expires", "900")
        .append_pair("X-Amz-SignedHeaders", "host");
    let canonical = format!(
        "GET\n{}\n{}\nhost:{}\n\nhost\nUNSIGNED-PAYLOAD",
        url.path(),
        canonical_query(&url),
        host(&url)
    );
    let message = format!(
        "AWS4-HMAC-SHA256\n{timestamp}\n{scope}\n{}",
        hash(canonical.as_bytes())
    );
    let signature = hex(&mac(&signing_key(cfg, &date)?, &message));
    url.query_pairs_mut()
        .append_pair("X-Amz-Signature", &signature);
    Ok(url.to_string())
}
pub async fn request(
    s: &NativeState,
    cfg: &Value,
    method: reqwest::Method,
    key: &str,
    query: &[(&str, &str)],
    data: Vec<u8>,
    content_type: Option<&str>,
) -> Result<reqwest::Response> {
    let mut url = target(cfg, key)?;
    for (k, v) in query {
        url.query_pairs_mut().append_pair(k, v);
    }
    let now = chrono::Utc::now();
    let date = now.format("%Y%m%d").to_string();
    let timestamp = now.format("%Y%m%dT%H%M%SZ").to_string();
    let payload = hash(&data);
    let region = cfg["region"].as_str().unwrap_or("auto");
    let scope = format!("{date}/{region}/s3/aws4_request");
    let signed = "host;x-amz-content-sha256;x-amz-date";
    let headers = format!(
        "host:{}\nx-amz-content-sha256:{payload}\nx-amz-date:{timestamp}\n",
        host(&url)
    );
    let canonical = format!(
        "{}\n{}\n{}\n{headers}\n{signed}\n{payload}",
        method.as_str(),
        url.path(),
        canonical_query(&url)
    );
    let message = format!(
        "AWS4-HMAC-SHA256\n{timestamp}\n{scope}\n{}",
        hash(canonical.as_bytes())
    );
    let signature = hex(&mac(&signing_key(cfg, &date)?, &message));
    let authorization = format!(
        "AWS4-HMAC-SHA256 Credential={}/{scope}, SignedHeaders={signed}, Signature={signature}",
        text(cfg, "accessKeyId")?
    );
    let mut request = s
        .http
        .request(method, url)
        .header("x-amz-date", timestamp)
        .header("x-amz-content-sha256", payload)
        .header("Authorization", authorization)
        .body(data);
    if let Some(ct) = content_type {
        request = request.header("Content-Type", ct);
    }
    let response = request
        .send()
        .await
        .map_err(|_| "Storage connection failed")?;
    if !response.status().is_success() {
        return Err(format!(
            "Storage returned HTTP {}. Check the endpoint, bucket and key permissions.",
            response.status().as_u16()
        ));
    }
    Ok(response)
}
pub async fn test(s: &NativeState, service: &str) -> Result<Value> {
    if service == "s3" {
        let cfg = s.service_settings("s3")?;
        request(s, &cfg, reqwest::Method::HEAD, "", &[], vec![], None).await?;
        return Ok(json!({"success":true,"message":"Bucket accessible via native signed API"}));
    }
    let cfg = s.service_settings(service)?;
    let url = match service {
        "runpod" => "https://api.runpod.io/graphql",
        "elevenlabs" => "https://api.elevenlabs.io/v1/user",
        _ => return Err("Unknown service".into()),
    };
    if service == "runpod" {
        return Err("Test a saved Runpod endpoint from Endpoints → Test connection".into());
    }
    let response = s
        .http
        .get(url)
        .header("xi-api-key", text(&cfg, "apiKey")?)
        .send()
        .await
        .map_err(|_| "Integration connection failed")?;
    if !response.status().is_success() {
        return Err(format!(
            "Integration returned HTTP {}",
            response.status().as_u16()
        ));
    }
    Ok(json!({"success":true,"message":"Connection verified"}))
}
#[derive(serde::Deserialize, Default)]
struct Listing {
    #[serde(rename = "Contents", default)]
    contents: Vec<Object>,
    #[serde(rename = "CommonPrefixes", default)]
    prefixes: Vec<Prefix>,
    #[serde(rename = "NextContinuationToken", default)]
    next: Option<String>,
}
#[derive(serde::Deserialize)]
struct Object {
    #[serde(rename = "Key")]
    key: String,
    #[serde(rename = "Size")]
    size: u64,
    #[serde(rename = "LastModified", default)]
    modified: String,
}
#[derive(serde::Deserialize)]
struct Prefix {
    #[serde(rename = "Prefix")]
    prefix: String,
}
pub async fn dispatch(
    s: &NativeState,
    path: &str,
    method: &str,
    body: &Value,
    query: &std::collections::HashMap<String, String>,
) -> Result<Value> {
    let cfg = s.service_settings("s3")?;
    match (path, method) {
        ("/api/s3-storage/files", "GET") | ("/api/s3-storage/loras", "GET") => {
            let prefix = query
                .get("prefix")
                .or_else(|| query.get("path"))
                .map(String::as_str)
                .unwrap_or("");
            let mut q = vec![
                ("list-type", "2"),
                ("prefix", prefix),
                ("delimiter", "/"),
                ("max-keys", "500"),
            ];
            if let Some(token) = query.get("continuationToken") {
                q.push(("continuation-token", token));
            }
            let response = request(s, &cfg, reqwest::Method::GET, "", &q, vec![], None).await?;
            let xml = response
                .text()
                .await
                .map_err(|_| "Storage list response failed")?;
            let listing: Listing =
                quick_xml::de::from_str(&xml).map_err(|_| "Invalid storage listing")?;
            let files:Vec<Value>=listing.contents.iter().map(|o|json!({"key":o.key,"name":o.key.rsplit('/').next().unwrap_or(""),"size":o.size,"lastModified":o.modified,"url":presign(&cfg,&o.key).ok(),"isDirectory":false})).collect();
            let folders:Vec<Value>=listing.prefixes.iter().map(|o|json!({"key":o.prefix,"name":o.prefix.trim_end_matches('/').rsplit('/').next().unwrap_or(""),"isDirectory":true,"size":0})).collect();
            Ok(
                json!({"success":true,"files":files,"folders":folders,"nextContinuationToken":listing.next,"prefix":prefix}),
            )
        }
        ("/api/s3-storage/upload", "POST") => {
            let file = body.get("file").ok_or("File required")?;
            let name = text(file, "name")?;
            let prefix = body["path"]
                .as_str()
                .or_else(|| body["prefix"].as_str())
                .unwrap_or("")
                .trim_matches('/');
            if name.contains('/') || name.contains('\\') {
                return Err("Invalid filename".into());
            }
            let key = if prefix.is_empty() {
                name.to_string()
            } else {
                format!("{prefix}/{name}")
            };
            let data = crate::media::file_bytes(file)?;
            request(
                s,
                &cfg,
                reqwest::Method::PUT,
                &key,
                &[],
                data,
                Some(file["type"].as_str().unwrap_or("application/octet-stream")),
            )
            .await?;
            Ok(json!({"success":true,"key":key,"url":presign(&cfg,&key)?,"filePath":key}))
        }
        ("/api/s3-storage/create-folder", "POST") => {
            let name = body["folderName"]
                .as_str()
                .or_else(|| body["name"].as_str())
                .ok_or("Folder name required")?;
            let key = format!("{}{name}/", body["path"].as_str().unwrap_or(""));
            request(s, &cfg, reqwest::Method::PUT, &key, &[], vec![], None).await?;
            Ok(json!({"success":true}))
        }
        ("/api/s3-storage/delete", "POST") | ("/api/s3-storage/delete", "DELETE") => {
            let keys = body["keys"].as_array().ok_or("Object keys required")?;
            if keys.len() > 100 {
                return Err("Delete at most 100 selected objects at once".into());
            }
            for key in keys {
                request(
                    s,
                    &cfg,
                    reqwest::Method::DELETE,
                    key.as_str().ok_or("Invalid key")?,
                    &[],
                    vec![],
                    None,
                )
                .await?;
            }
            Ok(json!({"success":true}))
        }
        ("/api/s3-storage/download", "GET") => {
            let key = query.get("key").ok_or("Object key required")?;
            Ok(json!({"success":true,"url":presign(&cfg,key)?,"downloadUrl":presign(&cfg,key)?}))
        }
        ("/api/s3-storage/volumes", "GET") => Ok(
            json!({"success":true,"volumes":[{"id":"r2","name":cfg["bucketName"],"region":cfg["region"]}]}),
        ),
        _ => Err("Unsupported storage operation".into()),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hmac_known_vector() {
        assert_eq!(
            hex(&mac(b"key", "The quick brown fox jumps over the lazy dog")),
            "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8"
        );
    }
    #[test]
    fn paths_and_signatures() {
        let c = json!({"endpointUrl":"https://example.r2.cloudflarestorage.com","bucketName":"test-bucket","region":"auto","accessKeyId":"test","secretAccessKey":"test-secret"});
        assert!(target(&c, "../secret").is_err());
        let u = presign(&c, "folder/a b.png").unwrap();
        assert!(u.contains("X-Amz-Signature="));
        assert!(!u.contains("test-secret"));
        assert!(u.contains("a%20b.png"));
    }
}
