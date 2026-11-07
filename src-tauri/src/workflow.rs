use crate::service::{err, id, now, text, NativeState, Result};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;
pub fn endpoint_url(value: &str) -> Result<String> {
    let u = url::Url::parse(value).map_err(|_| "Invalid endpoint URL")?;
    if !u.username().is_empty()
        || u.password().is_some()
        || u.query().is_some()
        || u.fragment().is_some()
        || u.path() != "/"
    {
        return Err("Use a service origin without credentials, path, query or fragment".into());
    }
    if u.scheme() != "https"
        && !(u.scheme() == "http" && [Some("127.0.0.1"), Some("localhost")].contains(&u.host_str()))
    {
        return Err("Use HTTPS, or localhost HTTP for testing".into());
    }
    Ok(u.origin().ascii_serialization())
}
fn validate(doc: &Value) -> Result<()> {
    if doc.to_string().len() > 2 * 1024 * 1024 {
        return Err("Workflow exceeds 2 MiB".into());
    }
    let graph = doc["graph"]
        .as_object()
        .ok_or("API-format graph required")?;
    let bindings = doc["bindings"]
        .as_array()
        .ok_or("Bindings array required")?;
    if doc["schemaVersion"] != 1 || graph.is_empty() || graph.len() > 2000 || bindings.len() > 100 {
        return Err("Invalid workflow size or schemaVersion".into());
    }
    for (key, node) in graph {
        if key.is_empty()
            || !key.chars().all(|c| c.is_ascii_digit())
            || node["class_type"].as_str().unwrap_or("").is_empty()
            || !node["inputs"].is_object()
        {
            return Err(format!("Invalid node {key}"));
        }
    }
    let mut keys = std::collections::HashSet::new();
    for b in bindings {
        let key = text(b, "key")?;
        if key.len() > 64
            || !key.chars().next().unwrap().is_ascii_alphabetic()
            || !key
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
            || !keys.insert(key)
        {
            return Err("Invalid or duplicate binding key".into());
        }
        let node = text(b, "node")?;
        let input = text(b, "input")?;
        let kind = text(b, "type")?;
        if !["string", "number", "boolean", "enum", "json"].contains(&kind)
            || graph
                .get(node)
                .and_then(|v| v["inputs"].get(input))
                .is_none()
        {
            return Err("Invalid binding mapping or type".into());
        }
        if kind == "enum"
            && !b["options"]
                .as_array()
                .is_some_and(|v| !v.is_empty() && v.iter().all(Value::is_string))
        {
            return Err("Enum options required".into());
        }
        for key in ["min", "max"] {
            if b.get(key).is_some_and(|v| !v.is_number()) {
                return Err("Invalid numeric bound".into());
            }
        }
    }
    Ok(())
}
fn resolve(doc: &Value, values: &Value) -> Result<Value> {
    validate(doc)?;
    let values = values.as_object().ok_or("Values object required")?;
    let bindings = doc["bindings"].as_array().unwrap();
    for key in values.keys() {
        if !bindings.iter().any(|b| b["key"] == key.as_str()) {
            return Err(format!("Unknown parameter {key}"));
        }
    }
    let mut graph = doc["graph"].clone();
    for b in bindings {
        let key = text(b, "key")?;
        let node = text(b, "node")?;
        let input = text(b, "input")?;
        let value = values
            .get(key)
            .or_else(|| b.get("default"))
            .unwrap_or(&doc["graph"][node]["inputs"][input]);
        let valid = match text(b, "type")? {
            "string" => value.is_string(),
            "boolean" => value.is_boolean(),
            "enum" => b["options"].as_array().unwrap().contains(value),
            "number" => value.as_f64().is_some_and(|n| {
                n.is_finite()
                    && b["min"].as_f64().is_none_or(|min| n >= min)
                    && b["max"].as_f64().is_none_or(|max| n <= max)
            }),
            _ => true,
        };
        if !valid || value.to_string().len() > 100000 {
            return Err(format!("Invalid value for {key}"));
        }
        graph[node]["inputs"][input] = value.clone();
    }
    Ok(graph)
}
fn parsed(mut row: Value) -> Result<Value> {
    for key in ["document", "snapshot", "artifacts", "events"] {
        if let Some(raw) = row[key].as_str() {
            let parsed = serde_json::from_str(raw).map_err(err)?;
            row[key] = parsed;
        }
    }
    Ok(row)
}
fn definition(s: &NativeState, key: &str, kind: &str) -> Result<Value> {
    let row = parsed(s.one("StudioDefinition", key)?)?;
    if row["kind"] != kind {
        return Err("Wrong definition kind".into());
    }
    Ok(row)
}
fn config(s: &NativeState, endpoint: &Value) -> Result<(String, Option<String>)> {
    let doc = &endpoint["document"];
    let endpoint_id = text(endpoint, "id")?;
    let url = if doc["provider"] == "runpod" {
        format!("https://api.runpod.ai/v2/{}", text(doc, "endpointId")?)
    } else {
        endpoint_url(text(doc, "url")?)?
    };
    let has_key = doc["credentialStored"].as_bool().unwrap_or(false);
    let key = if has_key {
        Some(s.secret(&format!("endpoint:{endpoint_id}"))?)
    } else {
        None
    };
    Ok((url, key))
}
async fn request(
    s: &NativeState,
    url: &str,
    key: &Option<String>,
    method: reqwest::Method,
    body: Option<Value>,
) -> Result<reqwest::Response> {
    let mut req = s.http.request(method, url);
    if let Some(key) = key {
        req = req.bearer_auth(key);
    }
    if let Some(body) = body {
        req = req.json(&body);
    }
    req.send()
        .await
        .map_err(|_| "Provider connection failed; no automatic submission retry".into())
}
async fn response_json(response: reqwest::Response) -> Result<Value> {
    if !response.status().is_success() {
        return Err(format!(
            "Provider returned HTTP {}",
            response.status().as_u16()
        ));
    }
    response
        .json()
        .await
        .map_err(|_| "Provider returned invalid JSON".into())
}
pub async fn dispatch(s: &NativeState, method: &str, body: Value) -> Result<Value> {
    if method == "GET" {
        let definitions = s
            .query(
                "SELECT * FROM StudioDefinition ORDER BY createdAt DESC",
                &[],
            )?
            .into_iter()
            .map(parsed)
            .collect::<Result<Vec<_>>>()?;
        let runs = s
            .query(
                "SELECT * FROM StudioRun ORDER BY createdAt DESC LIMIT 100",
                &[],
            )?
            .into_iter()
            .map(parsed)
            .collect::<Result<Vec<_>>>()?;
        return Ok(json!({"definitions":definitions,"runs":runs}));
    }
    if method != "POST" {
        return Err("Unsupported method".into());
    }
    match text(&body, "action")? {
        "define" => define(s, &body),
        "test" => {
            let ep = definition(s, text(&body, "id")?, "endpoint")?;
            let (url, key) = config(s, &ep)?;
            if ep["document"]["provider"] == "runpod" {
                let health = response_json(
                    request(
                        s,
                        &format!("{url}/health"),
                        &key,
                        reqwest::Method::GET,
                        None,
                    )
                    .await?,
                )
                .await?;
                return Ok(
                    json!({"device":"Runpod Serverless","nodeCount":0,"checkedAt":now(),"health":health}),
                );
            }
            let stats = response_json(
                request(
                    s,
                    &format!("{url}/system_stats"),
                    &key,
                    reqwest::Method::GET,
                    None,
                )
                .await?,
            )
            .await?;
            if !stats["system"].is_object() || !stats["devices"].is_array() {
                return Err("Not a ComfyUI system_stats response".into());
            }
            let nodes = response_json(
                request(
                    s,
                    &format!("{url}/object_info"),
                    &key,
                    reqwest::Method::GET,
                    None,
                )
                .await?,
            )
            .await?;
            Ok(
                json!({"device":stats["devices"][0]["name"].as_str().unwrap_or("CPU"),"nodeCount":nodes.as_object().map(|n|n.len()).unwrap_or(0),"checkedAt":now()}),
            )
        }
        "submit" => submit(s, &body).await,
        "refresh" => {
            let key = text(&body, "id")?.to_string();
            {
                let mut locks = s.refreshing.lock().map_err(err)?;
                if !locks.insert(key.clone()) {
                    return Err("Already reconciling this job".into());
                }
            }
            let result = refresh(s, &key, body["providerId"].as_str()).await;
            s.refreshing.lock().map_err(err)?.remove(&key);
            if let Err(error) = &result {
                let _ = s.execute(
                    "UPDATE StudioRun SET error=?,updatedAt=? WHERE id=?",
                    &[&error, &now(), &key],
                );
            }
            result.map(|_| json!({"success":true}))
        }
        "cancel" => cancel(s, text(&body, "id")?).await,
        _ => Err("Unknown Studio action".into()),
    }
}
fn define(s: &NativeState, body: &Value) -> Result<Value> {
    let kind = text(body, "kind")?;
    let name = text(body, "name")?.trim();
    let version = text(body, "version")?;
    if !["workflow", "endpoint", "model"].contains(&kind)
        || name.is_empty()
        || name.len() > 120
        || version.len() > 40
        || !version
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "_.-".contains(c))
    {
        return Err("Invalid kind, name or version".into());
    }
    let mut doc = body["document"].clone();
    let key = id();
    if kind == "workflow" {
        validate(&doc)?;
    }
    if kind == "endpoint" {
        let provider = text(&doc, "provider")?.to_string();
        doc = if provider == "comfyui" {
            json!({"provider":"comfyui","url":endpoint_url(text(&doc,"url")?)?})
        } else if provider == "runpod" {
            let endpoint_id = text(&doc, "endpointId")?;
            if endpoint_id.len() > 128
                || !endpoint_id
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
            {
                return Err("Invalid Runpod endpoint ID".into());
            }
            json!({"provider":"runpod","endpointId":endpoint_id,"url":format!("https://api.runpod.ai/v2/{endpoint_id}")})
        } else {
            return Err("Unsupported endpoint provider".into());
        };
        if let Some(secret) = body["apiKey"].as_str().filter(|s| !s.is_empty()) {
            if secret.len() > 4096 {
                return Err("Invalid credential".into());
            }
            security_framework::passwords::set_generic_password(
                "com.oopsie.studio.native",
                &format!("endpoint:{key}"),
                secret.as_bytes(),
            )
            .map_err(|_| "Keychain write failed")?;
            doc["credentialStored"] = json!(true);
        }
        if provider == "runpod" && doc["credentialStored"] != true {
            return Err("Runpod requires an API key".into());
        }
    }
    if kind == "model" {
        let hash = doc["sha256"].as_str().unwrap_or("");
        if !hash.is_empty() && (hash.len() != 64 || !hash.chars().all(|c| c.is_ascii_hexdigit())) {
            return Err("Invalid SHA-256".into());
        }
        doc = json!({"family":text(&doc,"family")?,"source":text(&doc,"source")?,"license":text(&doc,"license")?,"sha256":hash,"verified":false});
    }
    s.execute(
        "INSERT INTO StudioDefinition(id,kind,name,version,document) VALUES(?,?,?,?,?)",
        &[&key, &kind, &name, &version, &doc.to_string()],
    )
    .map_err(|_| "Definition already exists or could not be saved".to_string())?;
    Ok(json!({"id":key}))
}
async fn submit(s: &NativeState, body: &Value) -> Result<Value> {
    let workflow = definition(s, text(body, "workflowId")?, "workflow")?;
    let ep = definition(s, text(body, "endpointId")?, "endpoint")?;
    let graph = resolve(
        &workflow["document"],
        body.get("values").unwrap_or(&json!({})),
    )?;
    let (url, key) = config(s, &ep)?;
    let runpod = ep["document"]["provider"] == "runpod";
    if !runpod {
        let nodes = response_json(
            request(
                s,
                &format!("{url}/object_info"),
                &key,
                reqwest::Method::GET,
                None,
            )
            .await?,
        )
        .await?;
        for node in graph.as_object().unwrap().values() {
            let class = text(node, "class_type")?;
            if nodes.get(class).is_none() {
                return Err(format!("Pod is missing node {class}"));
            }
        }
    }
    let local_id = id();
    let snapshot = json!({"schemaVersion":1,"workflow":{"id":workflow["id"],"name":workflow["name"],"version":workflow["version"]},"endpoint":ep,"graph":graph,"clientId":local_id});
    let events = json!([{"at":now(),"message":"Submission intent saved. Never automatically repeat this POST."}]);
    s.execute("INSERT INTO StudioRun(id,endpointId,workflowId,snapshot,status,uncertain,events,updatedAt) VALUES(?,?,?,?, 'Queued',1,?,?)",&[&local_id,&text(&ep,"id")?,&text(&workflow,"id")?,&snapshot.to_string(),&events.to_string(),&now()])?;
    let (path, payload) = if runpod {
        ("/run", json!({"input":{"workflow":graph}}))
    } else {
        ("/prompt", json!({"prompt":graph,"client_id":local_id}))
    };
    match request(
        s,
        &format!("{url}{path}"),
        &key,
        reqwest::Method::POST,
        Some(payload),
    )
    .await
    {
        Ok(response) if response.status().is_client_error() => {
            s.execute(
                "UPDATE StudioRun SET status='Failed',uncertain=0,error=?,updatedAt=? WHERE id=?",
                &[
                    &format!(
                        "Provider rejected request (HTTP {})",
                        response.status().as_u16()
                    ),
                    &now(),
                    &local_id,
                ],
            )?;
        }
        Ok(response) if response.status().is_success() => {
            if let Ok(value) = response.json::<Value>().await {
                if let Some(provider_id) = value[if runpod { "id" } else { "prompt_id" }]
                    .as_str()
                    .filter(|v| !v.is_empty())
                {
                    s.execute(
                        "UPDATE StudioRun SET providerId=?,uncertain=0,updatedAt=? WHERE id=?",
                        &[&provider_id, &now(), &local_id],
                    )?;
                }
            }
        }
        _ => {}
    }
    s.execute("UPDATE StudioRun SET error='Submission acknowledgement unavailable. Verify provider history; never resubmit automatically.' WHERE id=? AND uncertain=1",&[&local_id])?;
    Ok(json!({"id":local_id}))
}
fn safe_provider_id(id: &str) -> Result<&str> {
    if id.is_empty()
        || id.len() > 200
        || !id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "_-".contains(c))
    {
        Err("Invalid provider job ID".into())
    } else {
        Ok(id)
    }
}
async fn refresh(s: &NativeState, local_id: &str, attached: Option<&str>) -> Result<()> {
    let run = parsed(s.one("StudioRun", local_id)?)?;
    let ep = &run["snapshot"]["endpoint"];
    let (url, key) = config(s, ep)?;
    let provider_id = safe_provider_id(
        attached
            .or_else(|| run["providerId"].as_str())
            .ok_or("Provider ID required to reconcile uncertain submission")?,
    )?;
    if ep["document"]["provider"] == "runpod" {
        if attached.is_some() && run["providerId"].is_null() {
            return Err("Runpod ID attachment requires independent input verification; inspect provider records first".into());
        }
        let value = response_json(
            request(
                s,
                &format!("{url}/status/{provider_id}"),
                &key,
                reqwest::Method::GET,
                None,
            )
            .await?,
        )
        .await?;
        let status = match value["status"].as_str().unwrap_or("") {
            "IN_QUEUE" => "Queued",
            "IN_PROGRESS" => "Running",
            "COMPLETED" => "Downloading",
            "FAILED" => "Failed",
            "CANCELLED" => "Cancelled",
            "TIMED_OUT" => "Failed",
            _ => return Err("Unknown Runpod status; saved state retained".into()),
        };
        s.execute(
            "UPDATE StudioRun SET status=?,error=?,updatedAt=? WHERE id=?",
            &[
                &status,
                &if status == "Failed" {
                    Some("Provider job failed or timed out")
                } else {
                    None
                },
                &now(),
                &local_id,
            ],
        )?;
        if status == "Downloading" {
            let mut urls = Vec::new();
            collect_urls(&value["output"], &mut urls);
            if urls.is_empty() {
                return Err("Worker returned no durable HTTPS output URLs. Configure persistent R2 output; inline/base64 output is unsupported.".into());
            }
            let mut artifacts = run["artifacts"].as_array().cloned().unwrap_or_default();
            for (index, url) in urls.iter().enumerate().skip(artifacts.len()) {
                let parsed = url::Url::parse(url).map_err(err)?;
                let filename = parsed
                    .path_segments()
                    .and_then(|mut s| s.next_back())
                    .unwrap_or("output.png");
                artifacts.push(download(s, local_id, index, filename, url, None).await?);
                save_artifacts(s, local_id, &artifacts)?;
            }
            complete(s, local_id)?;
        }
        return Ok(());
    }
    let history = response_json(
        request(
            s,
            &format!("{url}/history/{provider_id}"),
            &key,
            reqwest::Method::GET,
            None,
        )
        .await?,
    )
    .await?;
    let entry = &history[provider_id];
    if entry.is_null() {
        if attached.is_some() {
            return Err(
                "Prompt not found in completed history; cannot verify this attachment".into(),
            );
        }
        let queue = response_json(
            request(s, &format!("{url}/queue"), &key, reqwest::Method::GET, None).await?,
        )
        .await?;
        let active = queue["queue_running"]
            .as_array()
            .is_some_and(|q| q.iter().any(|item| item[1] == provider_id));
        if active {
            s.execute(
                "UPDATE StudioRun SET status='Running',updatedAt=? WHERE id=?",
                &[&now(), &local_id],
            )?;
        }
        return Ok(());
    }
    if attached.is_some() {
        if entry["prompt"][2] != run["snapshot"]["graph"]
            || entry["prompt"][3]["client_id"] != run["snapshot"]["clientId"]
        {
            return Err("Provider history does not match immutable graph and client ID".into());
        }
        s.execute(
            "UPDATE StudioRun SET providerId=?,uncertain=0,error=NULL,updatedAt=? WHERE id=?",
            &[&provider_id, &now(), &local_id],
        )?;
    }
    if entry["status"]["status_str"] == "error" {
        s.execute("UPDATE StudioRun SET status='Failed',error='ComfyUI execution failed',updatedAt=? WHERE id=?",&[&now(),&local_id])?;
        return Ok(());
    }
    if entry["status"]["completed"] != true {
        return Ok(());
    }
    s.execute(
        "UPDATE StudioRun SET status='Downloading',updatedAt=? WHERE id=?",
        &[&now(), &local_id],
    )?;
    let mut outputs = Vec::new();
    if let Some(nodes) = entry["outputs"].as_object() {
        for output in nodes.values() {
            for kind in ["images", "gifs", "audio"] {
                if let Some(files) = output[kind].as_array() {
                    for file in files {
                        if file["type"] == "output" {
                            outputs.push(file);
                        }
                    }
                }
            }
        }
    }
    if outputs.is_empty() {
        return Err("Workflow completed without saved output files".into());
    }
    let mut artifacts = run["artifacts"].as_array().cloned().unwrap_or_default();
    for (index, file) in outputs.iter().enumerate().skip(artifacts.len()) {
        let filename = text(file, "filename")?;
        let mut url = url::Url::parse(&format!("{url}/view")).map_err(err)?;
        url.query_pairs_mut()
            .append_pair("filename", filename)
            .append_pair("subfolder", file["subfolder"].as_str().unwrap_or(""))
            .append_pair("type", "output");
        artifacts.push(download(s, local_id, index, filename, url.as_str(), key.clone()).await?);
        save_artifacts(s, local_id, &artifacts)?;
    }
    complete(s, local_id)
}
fn save_artifacts(s: &NativeState, id: &str, files: &[Value]) -> Result<()> {
    s.execute(
        "UPDATE StudioRun SET artifacts=?,updatedAt=? WHERE id=?",
        &[&json!(files).to_string(), &now(), &id],
    )?;
    Ok(())
}
fn complete(s: &NativeState, id: &str) -> Result<()> {
    let row = parsed(s.one("StudioRun", id)?)?;
    let mut events = row["events"].as_array().cloned().unwrap_or_default();
    events.push(json!({"at":now(),"message":"All output files saved locally with SHA-256"}));
    s.execute(
        "UPDATE StudioRun SET status='Completed',error=NULL,events=?,updatedAt=? WHERE id=?",
        &[&json!(events).to_string(), &now(), &id],
    )?;
    Ok(())
}
fn collect_urls(value: &Value, urls: &mut Vec<String>) {
    match value {
        Value::String(s) if s.starts_with("https://") => {
            if !urls.contains(s) {
                urls.push(s.clone());
            }
        }
        Value::Array(a) => {
            for v in a {
                collect_urls(v, urls)
            }
        }
        Value::Object(o) => {
            for (k, v) in o {
                if k != "thumbnail" && k != "thumbnail_url" {
                    collect_urls(v, urls)
                }
            }
        }
        _ => {}
    }
}
pub async fn download(
    s: &NativeState,
    run_id: &str,
    index: usize,
    filename: &str,
    url: &str,
    key: Option<String>,
) -> Result<Value> {
    // Only server-generated IDs are used for local paths.
    if uuid::Uuid::parse_str(run_id).is_err() {
        return Err("Invalid local media ID".into());
    }
    let ext = std::path::Path::new(filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if ![
        "png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "wav", "mp3", "flac", "ogg",
    ]
    .contains(&ext.as_str())
    {
        return Err("Unsupported artifact extension".into());
    }
    let dir = s.data.join("media").join(run_id);
    tokio::fs::create_dir_all(&dir).await.map_err(err)?;
    let target = dir.join(format!("{index}.{ext}"));
    let partial = target.with_extension(format!("{ext}.part"));
    let result=async {
        let mut response=request(s,url,&key,reqwest::Method::GET,None).await?;
        if !response.status().is_success(){return Err("Artifact download failed".to_string());}
        let mut file=tokio::fs::File::create(&partial).await.map_err(err)?;let mut hash=Sha256::new();let mut size=0usize;
        while let Some(chunk)=response.chunk().await.map_err(|_|"Artifact download interrupted")?{size+=chunk.len();if size>1024*1024*1024{return Err("Artifact exceeds 1 GiB".into());}hash.update(&chunk);file.write_all(&chunk).await.map_err(err)?;}
        if size==0{return Err("Empty artifact".into());}
        file.sync_all().await.map_err(err)?;drop(file);tokio::fs::rename(&partial,&target).await.map_err(err)?;
        Ok(json!({"url":s.media_url(&target),"filename":filename,"size":size,"sha256":format!("{:x}",hash.finalize())}))
    }.await;
    if result.is_err() {
        let _ = tokio::fs::remove_file(partial).await;
    }
    result
}
async fn cancel(s: &NativeState, local_id: &str) -> Result<Value> {
    let run = parsed(s.one("StudioRun", local_id)?)?;
    if ["Completed", "Failed", "Cancelled"].contains(&run["status"].as_str().unwrap_or("")) {
        return Err("Job is already terminal".into());
    }
    if run["snapshot"]["endpoint"]["document"]["provider"] != "runpod" {
        return Err("Direct ComfyUI interrupt is global; cancel from the pod UI to avoid interrupting another job".into());
    }
    let provider_id = safe_provider_id(text(&run, "providerId")?)?;
    let (url, key) = config(s, &run["snapshot"]["endpoint"])?;
    response_json(
        request(
            s,
            &format!("{url}/cancel/{provider_id}"),
            &key,
            reqwest::Method::POST,
            Some(json!({})),
        )
        .await?,
    )
    .await?;
    // Confirm through status polling rather than inventing terminal success.
    refresh(s, local_id, None).await?;
    Ok(json!({"success":true}))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_mapping_and_values() {
        let doc = json!({"schemaVersion":1,"graph":{"1":{"class_type":"Node","inputs":{"size":16}}},"bindings":[{"key":"size","node":"1","input":"size","type":"number","min":1,"max":64}]});
        assert_eq!(
            resolve(&doc, &json!({"size":32})).unwrap()["1"]["inputs"]["size"],
            32
        );
        assert!(resolve(&doc, &json!({"size":65})).is_err());
        assert!(resolve(&doc, &json!({"extra":1})).is_err());
    }
    #[test]
    fn refuses_endpoint_credentials_and_redirect_paths() {
        for url in [
            "http://example.com",
            "https://a:b@example.com",
            "https://example.com/path",
            "https://example.com?token=x",
        ] {
            assert!(endpoint_url(url).is_err());
        }
        assert_eq!(
            endpoint_url("http://127.0.0.1:8188").unwrap(),
            "http://127.0.0.1:8188"
        );
    }
    #[test]
    fn lost_ack_survives_restart_without_reposting() {
        tauri::async_runtime::block_on(async {
            use std::io::{Read, Write};
            let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
            let origin = format!("http://{}", listener.local_addr().unwrap());
            let server = std::thread::spawn(move || {
                for index in 0..2 {
                    let (mut stream, _) = listener.accept().unwrap();
                    stream
                        .set_read_timeout(Some(std::time::Duration::from_secs(5)))
                        .unwrap();
                    let mut buffer = [0u8; 65536];
                    let n = stream.read(&mut buffer).unwrap();
                    let header = String::from_utf8_lossy(&buffer[..n]);
                    if index == 0 {
                        assert!(header.starts_with("GET /object_info"));
                        let body = r#"{"Node":{}}"#;
                        write!(
                            stream,
                            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        )
                        .unwrap();
                    } else {
                        assert!(header.starts_with("POST /prompt")); /* accepted; response lost */
                    }
                }
            });
            let dir = std::env::temp_dir().join(id());
            let s = NativeState::new(dir.clone()).unwrap();
            let w=define(&s,&json!({"kind":"workflow","name":"test","version":"1","document":{"schemaVersion":1,"graph":{"1":{"class_type":"Node","inputs":{}}},"bindings":[]}})).unwrap();
            let e=define(&s,&json!({"kind":"endpoint","name":"local","version":"1","document":{"provider":"comfyui","url":origin}})).unwrap();
            let run = submit(
                &s,
                &json!({"workflowId":w["id"],"endpointId":e["id"],"values":{}}),
            )
            .await
            .unwrap();
            server.join().unwrap();
            drop(s);
            let s = NativeState::new(dir.clone()).unwrap();
            let saved = parsed(s.one("StudioRun", run["id"].as_str().unwrap()).unwrap()).unwrap();
            assert_eq!(saved["uncertain"], true);
            assert!(saved["providerId"].is_null());
            assert_eq!(saved["snapshot"]["graph"]["1"]["class_type"], "Node");
            assert!(refresh(&s, run["id"].as_str().unwrap(), None)
                .await
                .unwrap_err()
                .contains("Provider ID required"));
            drop(s);
            std::fs::remove_dir_all(dir).unwrap();
        });
    }
}
