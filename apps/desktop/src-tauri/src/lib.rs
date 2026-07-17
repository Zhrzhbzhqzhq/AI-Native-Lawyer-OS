use tauri::Manager;
use std::process::Command;
use std::thread;
use std::time::Duration;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn start_runtime(app: &tauri::AppHandle) {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let script = resource_dir.join("runtime/start-lawdesk.sh");

        let _ = Command::new("bash")
            .arg(script)
            .spawn();
    }

    thread::sleep(Duration::from_secs(8));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {

            start_runtime(&app.handle());

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.eval(
                    "window.location.href='http://127.0.0.1:3000'"
                );
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
