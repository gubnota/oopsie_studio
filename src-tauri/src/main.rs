#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod media;
mod service;
mod storage;
mod workflow;
use serde_json::Value;
use tauri::Manager;
#[tauri::command]
async fn api(
    state: tauri::State<'_, service::NativeState>,
    path: String,
    method: String,
    body: Value,
) -> Result<Value, String> {
    service::dispatch(&state, &path, &method, body).await
}
fn main() {
    // A bounded CLI harness exercises the same native services without a web server.
    if std::env::args().any(|a| a == "--native-smoke") {
        let result = tauri::async_runtime::block_on(service::smoke());
        match result {
            Ok(value) => println!("{value}"),
            Err(e) => {
                eprintln!("{e}");
                std::process::exit(1);
            }
        }
        return;
    }
    tauri::Builder::default()
        .setup(|app| {
            let state = service::NativeState::new(app.path().app_data_dir()?)?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![api])
        .run(tauri::generate_context!())
        .expect("Oopsie Studio could not start");
}
