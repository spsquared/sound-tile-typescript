// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn temp(s: &str) -> String {
    format!("oof, {}!", s)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![temp])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
