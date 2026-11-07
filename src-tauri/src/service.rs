use rusqlite::{types::ValueRef, Connection};
use serde_json::{json, Value};
use std::{collections::HashSet, path::PathBuf, sync::Mutex};
use uuid::Uuid;
pub type Result<T> = std::result::Result<T, String>;
pub fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
pub fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}
pub fn id() -> String {
    Uuid::new_v4().to_string()
}
pub fn text<'a>(v: &'a Value, key: &str) -> Result<&'a str> {
    v[key]
        .as_str()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("Missing {key}"))
}
pub struct NativeState {
    pub db: Mutex<Connection>,
    pub data: PathBuf,
    pub http: reqwest::Client,
    pub refreshing: Mutex<HashSet<String>>,
}
impl NativeState {
    pub fn new(data: PathBuf) -> Result<Self> {
        std::fs::create_dir_all(data.join("media")).map_err(err)?;
        let db = Connection::open(data.join("studio.db")).map_err(err)?;
        db.execute_batch(
            "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
        )
        .map_err(err)?;
        // Match existing tables without reapplying destructive Prisma migrations.
        let exists: i64 = db
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='jobs'",
                [],
                |r| r.get(0),
            )
            .map_err(err)?;
        if exists == 0 {
            db.execute_batch(include_str!("../../desktop/schema.sql"))
                .map_err(err)?;
        }
        db.execute_batch(include_str!("../../desktop/002-registries.sql"))
            .map_err(err)?;
        db.execute_batch("CREATE TABLE IF NOT EXISTS native_settings (service TEXT PRIMARY KEY, document TEXT NOT NULL);").map_err(err)?;
        let http = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .map_err(err)?;
        Ok(Self {
            db: Mutex::new(db),
            data,
            http,
            refreshing: Mutex::new(HashSet::new()),
        })
    }
    pub fn query(&self, sql: &str, values: &[&dyn rusqlite::ToSql]) -> Result<Vec<Value>> {
        let db = self.db.lock().map_err(err)?;
        let mut stmt = db.prepare(sql).map_err(err)?;
        let names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
        let rows = stmt
            .query_map(values, |r| {
                let mut obj = serde_json::Map::new();
                for (i, name) in names.iter().enumerate() {
                    let v = match r.get_ref(i)? {
                        ValueRef::Null => Value::Null,
                        ValueRef::Integer(v) => {
                            if ["uncertain", "muted", "locked", "isFavorite", "isDefault"]
                                .contains(&name.as_str())
                            {
                                json!(v != 0)
                            } else {
                                json!(v)
                            }
                        }
                        ValueRef::Real(v) => json!(v),
                        ValueRef::Text(v) => json!(String::from_utf8_lossy(v)),
                        ValueRef::Blob(_) => Value::Null,
                    };
                    obj.insert(name.clone(), v);
                }
                Ok(Value::Object(obj))
            })
            .map_err(err)?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(err)
    }
    pub fn execute(&self, sql: &str, values: &[&dyn rusqlite::ToSql]) -> Result<usize> {
        self.db
            .lock()
            .map_err(err)?
            .execute(sql, values)
            .map_err(err)
    }
    pub fn one(&self, table: &str, id: &str) -> Result<Value> {
        self.query(&format!("SELECT * FROM \"{table}\" WHERE id=?"), &[&id])?
            .pop()
            .ok_or_else(|| "Record not found".into())
    }
    pub fn secret(&self, name: &str) -> Result<String> {
        security_framework::passwords::get_generic_password("com.oopsie.studio.native", name)
            .map_err(|_| {
                "Credential missing or Keychain access denied; enter it in Settings".to_string()
            })
            .and_then(|v| String::from_utf8(v).map_err(err))
    }
    fn put_secret(&self, name: &str, value: &str) -> Result<()> {
        security_framework::passwords::set_generic_password(
            "com.oopsie.studio.native",
            name,
            value.as_bytes(),
        )
        .map_err(|_| "Could not save credential in Keychain".into())
    }
    pub fn settings(&self, reveal: bool) -> Result<Value> {
        let mut all = json!({"runpod":{"apiKey":"","endpoints":{}},"elevenlabs":{"apiKey":""},"s3":{"endpointUrl":"","bucketName":"","region":"auto","accessKeyId":"","secretAccessKey":""},"ui":{"language":"en"}});
        for row in self.query("SELECT service,document FROM native_settings", &[])? {
            let service = row["service"].as_str().unwrap_or_default();
            let mut doc: Value =
                serde_json::from_str(row["document"].as_str().unwrap_or("{}")).map_err(err)?;
            if let Some(obj) = doc.as_object_mut() {
                for (key, value) in obj.iter_mut() {
                    if sensitive(key) && value == "__KEYCHAIN__" {
                        *value = if reveal {
                            json!(self.secret(&format!("{service}.{key}"))?)
                        } else {
                            json!("********")
                        };
                    }
                }
            }
            all[service] = doc;
        }
        Ok(all)
    }
    pub fn service_settings(&self, service: &str) -> Result<Value> {
        let row = self
            .query(
                "SELECT document FROM native_settings WHERE service=?",
                &[&service],
            )?
            .pop()
            .ok_or("Configure this integration in Settings first")?;
        let mut doc: Value =
            serde_json::from_str(row["document"].as_str().unwrap_or("{}")).map_err(err)?;
        if let Some(obj) = doc.as_object_mut() {
            for (key, value) in obj {
                if sensitive(key) && value == "__KEYCHAIN__" {
                    *value = json!(self.secret(&format!("{service}.{key}"))?);
                }
            }
        }
        Ok(doc)
    }
    fn save_settings(&self, body: &Value) -> Result<Value> {
        let settings = body["settings"]
            .as_object()
            .ok_or("Settings object required")?;
        for (service, value) in settings {
            if ![
                "runpod",
                "elevenlabs",
                "s3",
                "ui",
                "workspace",
                "qwenImageEditHandler",
                "media",
            ]
            .contains(&service.as_str())
            {
                return Err("Unknown settings group".into());
            }
            let existing = self
                .query(
                    "SELECT document FROM native_settings WHERE service=?",
                    &[&service],
                )?
                .pop();
            let mut doc: Value = existing
                .and_then(|r| serde_json::from_str(r["document"].as_str()?).ok())
                .unwrap_or(json!({}));
            for (key, value) in value.as_object().ok_or("Invalid settings group")? {
                if sensitive(key) {
                    let raw = value.as_str().ok_or("Credential must be text")?;
                    if raw.contains('*') {
                        continue;
                    }
                    if raw.len() > 4096 {
                        return Err("Credential too long".into());
                    }
                    if !raw.is_empty() {
                        self.put_secret(&format!("{service}.{key}"), raw)?;
                        doc[key] = json!("__KEYCHAIN__");
                    } else {
                        let _ = security_framework::passwords::delete_generic_password(
                            "com.oopsie.studio.native",
                            &format!("{service}.{key}"),
                        );
                        doc[key] = json!("");
                    }
                } else {
                    doc[key] = value.clone();
                }
            }
            self.execute("INSERT INTO native_settings(service,document) VALUES(?,?) ON CONFLICT(service) DO UPDATE SET document=excluded.document", &[&service, &doc.to_string()])?;
        }
        Ok(
            json!({"success":true,"settings":self.settings(false)?,"status":self.settings_status()?}),
        )
    }
    fn settings_status(&self) -> Result<Value> {
        let s = self.settings(false)?;
        let configured = |k: &str| {
            if s[k]["apiKey"].as_str().unwrap_or("").is_empty() {
                "missing"
            } else {
                "configured"
            }
        };
        Ok(
            json!({"configured":"partial","runpod":configured("runpod"),"elevenlabs":configured("elevenlabs"),"s3":if s["s3"]["secretAccessKey"] == "********" {"configured"}else{"missing"}}),
        )
    }
    pub fn media_url(&self, path: &std::path::Path) -> String {
        let encoded: String =
            url::form_urlencoded::byte_serialize(path.to_string_lossy().as_bytes()).collect();
        format!("asset://localhost/{}", encoded.replace('+', "%20"))
    }
}
fn sensitive(key: &str) -> bool {
    ["apiKey", "accessKeyId", "secretAccessKey"].contains(&key)
}
pub async fn dispatch(state: &NativeState, path: &str, method: &str, body: Value) -> Result<Value> {
    let url = url::Url::parse(&format!("http://native{path}")).map_err(err)?;
    let route = url.path();
    let query: std::collections::HashMap<String, String> = url
        .query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();
    if body.to_string().len() > 140 * 1024 * 1024 {
        return Err("Request too large".into());
    }
    match (route, method) {
        ("/api/studio", _) => crate::workflow::dispatch(state, method, body).await,
        ("/api/settings", "GET") => Ok(
            json!({"success":true,"settings":state.settings(false)?,"status":state.settings_status()?,"timestamp":now()}),
        ),
        ("/api/settings", "POST") => state.save_settings(&body),
        ("/api/settings/test", "POST") => {
            crate::storage::test(state, body["service"].as_str().unwrap_or("")).await
        }
        (p, _) if p.starts_with("/api/s3-storage/") => {
            crate::storage::dispatch(state, p, method, &body, &query).await
        }
        ("/api/native/info", "GET") => Ok(
            json!({"runtime":"rust","version":env!("CARGO_PKG_VERSION"),"node":false,"dataDirectory":state.data,"media":crate::media::tools()}),
        ),
        ("/api/native/reveal", "POST") => crate::media::reveal(state, &body).await,
        ("/api/video-export", "POST") => crate::media::export(state, &body).await,
        ("/api/video-tracks/create-muted", "POST") => {
            crate::media::split(state, &body, false).await
        }
        ("/api/video-tracks/extract-audio", "POST") => {
            crate::media::split(state, &body, true).await
        }
        ("/api/video-tracks/detect-audio", "POST") => crate::media::detect(state, &body).await,
        ("/api/upload", "POST")
        | ("/api/save-audio", "POST")
        | ("/api/save-project-audio", "POST") => crate::media::upload(state, &body).await,
        ("/api/download", "POST") => crate::media::download(state, &body).await,
        ("/api/settings/clear", "POST") => {
            Err("For credential removal, clear each key in Settings and save".into())
        }
        _ => crud(state, route, method, &body, &query),
    }
}
fn sql_value(value: &Value) -> rusqlite::types::Value {
    use rusqlite::types::Value as S;
    match value {
        Value::Null => S::Null,
        Value::Bool(v) => S::Integer(i64::from(*v)),
        Value::Number(n) => n
            .as_i64()
            .map(S::Integer)
            .unwrap_or(S::Real(n.as_f64().unwrap_or(0.))),
        Value::String(s) => S::Text(s.clone()),
        _ => S::Text(value.to_string()),
    }
}
// Every table and writable column is a hard-coded local contract, never user SQL.
fn crud(
    s: &NativeState,
    route: &str,
    method: &str,
    body: &Value,
    query: &std::collections::HashMap<String, String>,
) -> Result<Value> {
    let segments: Vec<_> = route.trim_start_matches("/api/").split('/').collect();
    let (table,singular,plural,columns,required,defaults): (&str,&str,&str,&[&str],&[&str],Value) = match segments[0] {
        "workspaces" => ("workspaces","workspace","workspaces", &["name","description","color","isDefault"], &["name"],json!({"userId":"user-with-settings","description":"","color":"#4f46e5","isDefault":false})),
        "jobs" => ("jobs","job","jobs", &["workspaceId","status","type","prompt","runpodJobId","options","resultUrl","thumbnailUrl","isFavorite","modelId","endpointId","error","cost","completedAt","imageInputPath","videoInputPath","audioInputPath"], &["type","status"],json!({"userId":"user-with-settings","modelId":"unknown"})),
        "workspace-media" => ("workspace_media","media","media", &["workspaceId","type","url","prompt","modelId"], &["workspaceId","type","url"],json!({})),
        "video-projects" => ("video_projects","project","projects", &["title","description","aspectRatio","qualityPreset","width","height","duration"], &["title"],json!({"description":"","aspectRatio":"16:9","qualityPreset":"720p","width":1280,"height":720,"duration":30000})),
        "video-tracks" => ("video_tracks","track","tracks", &["projectId","type","label","locked","order","volume","muted"], &["projectId","type","label"],json!({"locked":true,"order":0,"volume":100,"muted":false})),
        "video-keyframes" => ("video_keyframes","keyframe","keyframes", &["trackId","timestamp","duration","dataType","mediaId","url","prompt","fitMode","volume"], &["trackId","timestamp","duration","dataType","mediaId","url"],json!({})),
        "lora" => ("loras","lora","loras", &["name","fileName","s3Path","s3Url","fileSize","extension","workspaceId"], &["name","fileName","s3Path","s3Url","fileSize","extension"],json!({})),
        _ => return Err(format!("This operation is not available in the native desktop: {route}. The original browser implementation is retained separately.")),
    };
    let record_id = segments
        .get(1)
        .copied()
        .or_else(|| query.get("id").map(String::as_str));
    if segments.len() > 2 {
        return Err("Unsupported nested resource".into());
    }
    if method == "GET" {
        if let Some(id) = record_id {
            let mut row = s.one(table, id)?;
            if table == "video_projects" {
                enrich_project(s, &mut row)?;
            }
            return Ok(json!({"success":true,singular:row}));
        }
        let mut sql = format!("SELECT * FROM \"{table}\"");
        let mut values = Vec::new();
        for key in ["workspaceId", "projectId", "trackId"] {
            if columns.contains(&key) {
                if let Some(v) = query.get(key) {
                    sql.push_str(if values.is_empty() {
                        " WHERE "
                    } else {
                        " AND "
                    });
                    sql.push_str(&format!("\"{key}\"=?"));
                    values.push(v.clone());
                }
            }
        }
        sql.push_str(" ORDER BY rowid DESC LIMIT 500");
        let refs: Vec<&dyn rusqlite::ToSql> =
            values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
        let mut rows = s.query(&sql, &refs)?;
        if table == "video_projects" {
            for row in &mut rows {
                enrich_project(s, row)?;
            }
        }
        if table == "jobs" {
            for row in &mut rows {
                if row["options"].is_string() {
                    row["options"] =
                        serde_json::from_str(row["options"].as_str().unwrap()).unwrap_or(json!({}));
                }
            }
        }
        return Ok(json!({"success":true,plural:rows,"total":rows.len(),"hasMore":false}));
    }
    if method == "DELETE" {
        let id = record_id.ok_or("Record ID required")?;
        let mut db = s.db.lock().map_err(err)?;
        let tx = db.transaction().map_err(err)?;
        if table == "video_projects" {
            tx.execute("DELETE FROM video_keyframes WHERE trackId IN (SELECT id FROM video_tracks WHERE projectId=?)",[id]).map_err(err)?;
            tx.execute("DELETE FROM video_tracks WHERE projectId=?", [id])
                .map_err(err)?;
        }
        if table == "video_tracks" {
            tx.execute("DELETE FROM video_keyframes WHERE trackId=?", [id])
                .map_err(err)?;
        }
        tx.execute(&format!("DELETE FROM \"{table}\" WHERE id=?"), [id])
            .map_err(err)?;
        tx.commit().map_err(err)?;
        return Ok(json!({"success":true}));
    }
    if !["POST", "PUT", "PATCH"].contains(&method) {
        return Err("Unsupported method".into());
    }
    let id = record_id
        .map(String::from)
        .or_else(|| body["id"].as_str().map(String::from))
        .unwrap_or_else(id);
    let exists = s.one(table, &id).ok();
    let mut doc = exists.clone().unwrap_or(defaults);
    if !doc.is_object() {
        doc = json!({});
    }
    for &key in columns {
        if let Some(value) = body.get(key) {
            doc[key] = value.clone();
        }
    }
    if exists.is_none() {
        for &key in required {
            if doc[key].is_null() {
                return Err(format!("Missing {key}"));
            }
        }
    }
    if let Some(n) = doc["duration"].as_i64() {
        if n <= 0 || n > 3_600_000 {
            return Err("Invalid duration".into());
        }
    }
    doc["id"] = json!(id);
    if exists.is_none() {
        doc["createdAt"] = json!(now());
    }
    if ["workspaces", "video_projects", "loras"].contains(&table) {
        doc["updatedAt"] = json!(now());
    }
    if table == "loras" {
        doc.as_object_mut().unwrap().remove("createdAt");
        doc["uploadedAt"] = json!(now());
    }
    let obj = doc.as_object().ok_or("Invalid record")?;
    let keys: Vec<_> = obj.keys().collect();
    let values: Vec<_> = keys.iter().map(|k| sql_value(&obj[*k])).collect();
    let sql = if exists.is_none() {
        format!(
            "INSERT INTO \"{table}\" ({}) VALUES ({})",
            keys.iter()
                .map(|k| format!("\"{k}\""))
                .collect::<Vec<_>>()
                .join(","),
            vec!["?"; keys.len()].join(",")
        )
    } else {
        format!(
            "UPDATE \"{table}\" SET {} WHERE id=?",
            keys.iter()
                .map(|k| format!("\"{k}\"=?"))
                .collect::<Vec<_>>()
                .join(",")
        )
    };
    let mut refs: Vec<&dyn rusqlite::ToSql> =
        values.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
    if exists.is_some() {
        refs.push(&id);
    }
    s.execute(&sql, &refs)?;
    let mut row = s.one(table, &id)?;
    if table == "video_projects" {
        enrich_project(s, &mut row)?;
    }
    Ok(json!({"success":true,singular:row}))
}
fn enrich_project(s: &NativeState, row: &mut Value) -> Result<()> {
    let id = text(row, "id")?;
    let mut tracks = s.query(
        "SELECT * FROM video_tracks WHERE projectId=? ORDER BY \"order\"",
        &[&id],
    )?;
    for track in &mut tracks {
        track["keyframes"] = json!(s.query(
            "SELECT * FROM video_keyframes WHERE trackId=? ORDER BY timestamp",
            &[&text(track, "id")?]
        )?);
    }
    row["tracks"] = json!(tracks);
    Ok(())
}
pub async fn smoke() -> Result<Value> {
    let dir = std::env::temp_dir().join(format!("oopsie-native-smoke-{}", id()));
    let s = NativeState::new(dir.clone())?;
    let w = dispatch(
        &s,
        "/api/workspaces",
        "POST",
        json!({"name":"Smoke workspace"}),
    )
    .await?;
    let wid = text(&w["workspace"], "id")?;
    let p = dispatch(
        &s,
        "/api/video-projects",
        "POST",
        json!({"title":"Smoke project"}),
    )
    .await?;
    let pid = text(&p["project"], "id")?;
    dispatch(
        &s,
        "/api/video-tracks",
        "POST",
        json!({"projectId":pid,"type":"video","label":"Video"}),
    )
    .await?;
    drop(s);
    let s = NativeState::new(dir.clone())?;
    assert_eq!(
        dispatch(&s, "/api/workspaces", "GET", Value::Null).await?["workspaces"][0]["id"],
        wid
    );
    assert_eq!(
        dispatch(
            &s,
            &format!("/api/video-projects/{pid}"),
            "GET",
            Value::Null
        )
        .await?["project"]["tracks"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    let info = dispatch(&s, "/api/native/info", "GET", Value::Null).await?;
    drop(s);
    std::fs::remove_dir_all(dir).map_err(err)?;
    Ok(
        json!({"success":true,"checks":["SQLite init","workspace CRUD","timeline persistence","restart recovery","native runtime"],"runtime":info}),
    )
}
