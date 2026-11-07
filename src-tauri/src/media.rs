use crate::service::{err, id, text, NativeState, Result};
use base64::Engine;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use tokio::process::Command;
fn tool(name: &str) -> Option<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
    ];
    if let Some(home) = std::env::var_os("HOME") {
        dirs.push(PathBuf::from(home).join("local/homebrew/bin"));
    }
    if let Some(paths) = std::env::var_os("PATH") {
        dirs.extend(std::env::split_paths(&paths));
    }
    dirs.into_iter().map(|d| d.join(name)).find(|p| p.is_file())
}
pub fn tools() -> Value {
    json!({"ffmpeg":tool("ffmpeg").is_some(),"ffprobe":tool("ffprobe").is_some(),"bundled":false})
}
pub fn file_bytes(file: &Value) -> Result<Vec<u8>> {
    let a = file["bytes"].as_array().ok_or("Select a file first")?;
    if a.len() > 32 * 1024 * 1024 {
        return Err("Upload exceeds 32 MiB".into());
    }
    a.iter()
        .map(|n| {
            n.as_u64()
                .filter(|v| *v <= 255)
                .map(|v| v as u8)
                .ok_or("Invalid file bytes".into())
        })
        .collect()
}
fn extension(name: &str) -> Result<String> {
    let ext = Path::new(name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if ![
        "png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "mov", "wav", "mp3", "flac", "ogg",
        "m4a",
    ]
    .contains(&ext.as_str())
    {
        return Err("Unsupported media format".into());
    }
    Ok(ext)
}
pub async fn upload(s: &NativeState, body: &Value) -> Result<Value> {
    let file = body
        .get("file")
        .or_else(|| body.get("audio"))
        .ok_or("Select a media file")?;
    let bytes = file_bytes(file)?;
    let ext = extension(text(file, "name")?)?;
    let path = s.data.join("media").join(format!("{}.{}", id(), ext));
    tokio::fs::write(&path, bytes).await.map_err(err)?;
    Ok(
        json!({"success":true,"url":s.media_url(&path),"path":s.media_url(&path),"filePath":s.media_url(&path),"fullPath":path,"filename":file["name"]}),
    )
}
fn local(s: &NativeState, value: &str) -> Result<PathBuf> {
    let path = if value.starts_with("asset://localhost/")
        || value.starts_with("http://asset.localhost/")
    {
        let raw = value.split_once("localhost/").ok_or("Invalid media URL")?.1;
        // A URL query parser supplies strict percent decoding without accepting arbitrary file URLs.
        let u = url::Url::parse(&format!("http://local/?p={}", raw.replace('+', "%2B")))
            .map_err(err)?;
        PathBuf::from(
            u.query_pairs()
                .next()
                .ok_or("Invalid media path")?
                .1
                .into_owned(),
        )
    } else {
        PathBuf::from(value)
    };
    let canonical = path
        .canonicalize()
        .map_err(|_| "Local media is unavailable")?;
    let root = s.data.join("media").canonicalize().map_err(err)?;
    if !canonical.starts_with(root) || !canonical.is_file() {
        return Err("Only imported Studio media may be read".into());
    }
    Ok(canonical)
}
pub async fn download(s: &NativeState, body: &Value) -> Result<Value> {
    let value = text(body, "url")?;
    if value.starts_with("asset:") {
        let path = local(s, value)?;
        return Ok(json!({"success":true,"path":s.media_url(&path),"fullPath":path}));
    }
    let filename = body["filename"]
        .as_str()
        .filter(|v| !v.is_empty())
        .unwrap_or("output.png");
    if value.starts_with("data:") {
        let (header, data) = value.split_once(',').ok_or("Invalid data URL")?;
        if !header.ends_with(";base64") || data.len() > 44 * 1024 * 1024 {
            return Err("Invalid or oversized media".into());
        }
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(data)
            .map_err(err)?;
        let ext = extension(filename)?;
        let path = s.data.join("media").join(format!("{}.{}", id(), ext));
        tokio::fs::write(&path, bytes).await.map_err(err)?;
        return Ok(json!({"success":true,"path":s.media_url(&path),"fullPath":path}));
    }
    let u = url::Url::parse(value).map_err(err)?;
    if u.scheme() != "https" || !u.username().is_empty() || u.password().is_some() {
        return Err("A public HTTPS media URL is required".into());
    }
    let filename = body["filename"]
        .as_str()
        .or_else(|| u.path_segments().and_then(|mut p| p.next_back()))
        .unwrap_or("output.png");
    let artifact = crate::workflow::download(s, &id(), 0, filename, value, None).await?;
    Ok(json!({"success":true,"path":artifact["url"],"url":artifact["url"]}))
}
async fn run(name: &str, args: Vec<String>) -> Result<std::process::Output> {
    let bin = tool(name).ok_or_else(|| {
        format!("Install {name} to use this media operation. It is not bundled with Studio.")
    })?;
    tokio::time::timeout(
        std::time::Duration::from_secs(300),
        Command::new(bin).args(args).kill_on_drop(true).output(),
    )
    .await
    .map_err(|_| "Media operation exceeded five minutes")?
    .map_err(err)
}
pub async fn detect(s: &NativeState, body: &Value) -> Result<Value> {
    let value = body["videoPath"]
        .as_str()
        .or_else(|| body["url"].as_str())
        .ok_or("Video path required")?;
    let path = local(s, value)?;
    let out = run(
        "ffprobe",
        vec![
            "-v".into(),
            "error".into(),
            "-protocol_whitelist".into(),
            "file,pipe".into(),
            "-select_streams".into(),
            "a".into(),
            "-show_entries".into(),
            "stream=index".into(),
            "-of".into(),
            "json".into(),
            path.to_string_lossy().into_owned(),
        ],
    )
    .await?;
    if !out.status.success() {
        return Err("Could not inspect this video".into());
    }
    let v: Value = serde_json::from_slice(&out.stdout).map_err(err)?;
    Ok(json!({"hasAudio":v["streams"].as_array().is_some_and(|a|!a.is_empty())}))
}
pub async fn split(s: &NativeState, body: &Value, audio: bool) -> Result<Value> {
    let path = local(s, text(body, "videoPath")?)?;
    let output =
        s.data
            .join("media")
            .join(format!("{}.{}", id(), if audio { "wav" } else { "mp4" }));
    let mut args: Vec<String> = [
        "-nostdin",
        "-y",
        "-v",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-i",
    ]
    .into_iter()
    .map(String::from)
    .collect();
    args.push(path.to_string_lossy().into_owned());
    args.extend(
        if audio {
            vec!["-vn", "-c:a", "pcm_s16le"]
        } else {
            vec!["-an", "-c:v", "copy"]
        }
        .into_iter()
        .map(String::from),
    );
    args.push(output.to_string_lossy().into_owned());
    let result = run("ffmpeg", args).await?;
    if !result.status.success() {
        let _ = tokio::fs::remove_file(&output).await;
        return Err("Could not process the video with installed FFmpeg".into());
    }
    Ok(json!({"success":true,if audio {"audioPath"}else{"mutedVideoPath"}:s.media_url(&output)}))
}
async fn source(s: &NativeState, url: &str) -> Result<PathBuf> {
    if url.starts_with("https://") {
        let v = download(s, &json!({"url":url})).await?;
        local(s, text(&v, "path")?)
    } else {
        local(s, url)
    }
}
fn bounded(v: &Value, name: &str, min: f64, max: f64, default: f64) -> Result<f64> {
    let n = v[name].as_f64().unwrap_or(default);
    if !n.is_finite() || n < min || n > max {
        return Err(format!("Invalid {name}"));
    }
    Ok(n)
}
pub async fn export(s: &NativeState, body: &Value) -> Result<Value> {
    if body["options"]["format"]
        .as_str()
        .is_some_and(|v| v != "mp4")
    {
        return Err("Native export currently supports MP4".into());
    }
    let project = &body["project"];
    let scale = bounded(&body["options"], "resolution", 10., 100., 100.)? / 100.;
    let w = ((bounded(project, "width", 16., 4096., 1280.)? * scale / 2.).round() * 2.) as u32;
    let h = ((bounded(project, "height", 16., 4096., 720.)? * scale / 2.).round() * 2.) as u32;
    let tracks = body["tracks"].as_array().ok_or("Tracks required")?;
    if tracks.len() > 32 {
        return Err("Native export supports up to 32 tracks".into());
    }
    let mut clips = Vec::new();
    let mut duration = 0f64;
    for track in tracks {
        let track_id = text(track, "id")?;
        if let Some(frames) = body["keyframes"][track_id].as_array() {
            for frame in frames {
                if clips.len() >= 128 {
                    return Err("Native export supports up to 128 clips".into());
                }
                let start = bounded(frame, "timestamp", 0., 3_600_000., 0.)? / 1000.;
                let len = bounded(frame, "duration", 1., 3_600_000., 1000.)? / 1000.;
                if start + len > 3600. {
                    return Err("Timeline exceeds one hour".into());
                }
                let data = &frame["data"];
                let kind = text(data, "type")?;
                if !["image", "video", "music", "voiceover", "audio"].contains(&kind) {
                    return Err(format!("Native export does not support {kind} clips. Remove this clip before exporting."));
                }
                let path = source(s, text(data, "url")?).await?;
                let fit = data["fitMode"].as_str().unwrap_or("contain");
                if !["contain", "cover", "fill"].contains(&fit) {
                    return Err("Unsupported fit mode".into());
                }
                let volume = bounded(track, "volume", 0., 200., 100.)?
                    * bounded(data, "volume", 0., 200., 100.)?
                    / 10000.;
                clips.push((
                    kind.to_string(),
                    path,
                    start,
                    len,
                    fit.to_string(),
                    if track["muted"] == true { 0. } else { volume },
                ));
                duration = duration.max(start + len);
            }
        }
    }
    if duration == 0. {
        return Err("Add media to the timeline before exporting".into());
    }
    let output = s.data.join("media").join(format!("export-{}.mp4", id()));
    let partial = output.with_extension("part.mp4");
    let mut args: Vec<String> = vec!["-nostdin", "-y", "-v", "error", "-f", "lavfi", "-i"]
        .into_iter()
        .map(String::from)
        .collect();
    args.push(format!("color=c=black:s={w}x{h}:r=30:d={duration}"));
    for (kind, path, _, len, _, _) in &clips {
        if kind == "image" {
            args.extend(["-loop".into(), "1".into()]);
        }
        args.extend([
            "-protocol_whitelist".into(),
            "file,pipe".into(),
            "-t".into(),
            len.to_string(),
            "-i".into(),
            path.to_string_lossy().into_owned(),
        ]);
    }
    let mut filters = vec!["[0:v]null[base]".to_string()];
    let mut last = "base".to_string();
    let mut audio = Vec::new();
    for (i, (kind, _, start, len, fit, volume)) in clips.iter().enumerate() {
        let n = i + 1;
        if kind == "image" || kind == "video" {
            let size=match fit.as_str(){"cover"=>format!("scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"),"fill"=>format!("scale={w}:{h}"),_=>format!("scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black@0")};
            filters.push(format!("[{n}:v]fps=30,format=rgba,{size},trim=duration={len},setpts=PTS-STARTPTS+{start}/TB[v{n}]"));
            filters.push(format!(
                "[{last}][v{n}]overlay=eof_action=pass:enable='between(t,{start},{})'[o{n}]",
                start + len
            ));
            last = format!("o{n}");
            // Video audio is handled by explicit audio tracks, matching the editor preview.
        } else if *volume > 0. {
            filters.push(format!("[{n}:a]atrim=duration={len},asetpts=PTS-STARTPTS,volume={volume},adelay={}:all=1[a{n}]",(start*1000.).round() as u64));
            audio.push(format!("[a{n}]"));
        }
    }
    if !audio.is_empty() {
        filters.push(format!(
            "{}amix=inputs={}:normalize=0:duration=longest[aout]",
            audio.join(""),
            audio.len()
        ));
    }
    args.extend([
        "-filter_complex".into(),
        filters.join(";"),
        "-map".into(),
        format!("[{last}]"),
    ]);
    if !audio.is_empty() {
        args.extend(["-map".into(), "[aout]".into(), "-c:a".into(), "aac".into()]);
    }
    args.extend([
        "-t".into(),
        duration.to_string(),
        "-c:v".into(),
        "libx264".into(),
        "-preset".into(),
        "veryfast".into(),
        "-crf".into(),
        "20".into(),
        "-pix_fmt".into(),
        "yuv420p".into(),
        "-movflags".into(),
        "+faststart".into(),
        partial.to_string_lossy().into_owned(),
    ]);
    let result = run("ffmpeg", args).await;
    match result {
        Ok(out) if out.status.success() => {}
        _ => {
            let _ = tokio::fs::remove_file(&partial).await;
            return Err("FFmpeg export failed. Check that the selected media can be decoded by your installed FFmpeg.".into());
        }
    }
    tokio::fs::rename(partial, &output).await.map_err(err)?;
    Ok(
        json!({"success":true,"downloadUrl":s.media_url(&output),"path":s.media_url(&output),"native":true}),
    )
}
pub async fn reveal(s: &NativeState, body: &Value) -> Result<Value> {
    let path = local(s, text(body, "url")?)?;
    let status = Command::new("/usr/bin/open")
        .arg("-R")
        .arg(path)
        .status()
        .await
        .map_err(err)?;
    if !status.success() {
        return Err("Could not show this file in Finder".into());
    }
    Ok(json!({"success":true}))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_paths_outside_media() {
        let dir = std::env::temp_dir().join(id());
        let s = NativeState::new(dir.clone()).unwrap();
        assert!(local(&s, "/etc/passwd").is_err());
        drop(s);
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn validates_upload_bytes() {
        assert!(file_bytes(&json!({"bytes":[256]})).is_err());
        assert_eq!(file_bytes(&json!({"bytes":[0,255]})).unwrap(), vec![0, 255]);
    }
    #[test]
    fn exports_tiny_image_and_audio_timelines() {
        tauri::async_runtime::block_on(async {
            if tool("ffmpeg").is_none() || tool("ffprobe").is_none() {
                return;
            }
            let dir = std::env::temp_dir().join(id());
            let s = NativeState::new(dir.clone()).unwrap();
            let image = dir.join("media/test.png");
            let audio = dir.join("media/test.wav");
            for (input, output) in [
                ("color=c=purple:s=32x32:d=0.2", &image),
                ("sine=frequency=440:duration=0.2", &audio),
            ] {
                let mut args: Vec<String> =
                    ["-nostdin", "-y", "-v", "error", "-f", "lavfi", "-i", input]
                        .into_iter()
                        .map(String::from)
                        .collect();
                if output == &image {
                    args.extend(["-frames:v".into(), "1".into()]);
                }
                args.push(output.to_string_lossy().into_owned());
                assert!(run("ffmpeg", args).await.unwrap().status.success());
            }
            for (kind, path) in [("image", image), ("music", audio)] {
                let result=export(&s,&json!({"project":{"width":32,"height":32},"tracks":[{"id":"t","volume":100}],"keyframes":{"t":[{"timestamp":0,"duration":200,"data":{"type":kind,"url":s.media_url(&path)}}]},"options":{"format":"mp4"}})).await.unwrap();
                let path = local(&s, result["path"].as_str().unwrap()).unwrap();
                assert!(std::fs::metadata(&path).unwrap().len() > 100);
                let detected = detect(&s, &json!({"videoPath":result["path"]}))
                    .await
                    .unwrap();
                assert_eq!(detected["hasAudio"], kind == "music");
            }
            drop(s);
            std::fs::remove_dir_all(dir).unwrap();
        });
    }
}
