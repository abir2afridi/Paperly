use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, WindowEvent, Wry};
use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_dialog::FilePath;
use tauri_plugin_opener::OpenerExt;

// ---------------------------------------------------------------------------
// Provider storage (mirrors the web server's persistence file)
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProviderConfig {
    id: String,
    label: String,
    provider_type: String,
    base_url: String,
    #[serde(default)]
    api_key: Option<String>,
    model: String,
    #[serde(default)]
    extra_headers_json: Option<String>,
    #[serde(default)]
    temperature: Option<f32>,
    #[serde(default)]
    max_tokens: Option<u32>,
    #[serde(default)]
    is_default: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NewProviderInput {
    label: String,
    provider_type: String,
    base_url: String,
    api_key: String,
    model: String,
    #[serde(default)]
    is_default: Option<bool>,
}

fn providers_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {e}"))?;
    Ok(dir.join("texforge-ai-providers.json"))
}

fn read_providers(app: &AppHandle) -> Result<Vec<ProviderConfig>, String> {
    let file = providers_file(app)?;
    if !file.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&file).map_err(|e| format!("Failed to read providers: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("Providers file corrupt: {e}"))
}

fn write_providers(app: &AppHandle, providers: &[ProviderConfig]) -> Result<(), String> {
    let file = providers_file(app)?;
    let raw = serde_json::to_string_pretty(providers).map_err(|e| e.to_string())?;
    fs::write(&file, raw).map_err(|e| format!("Failed to write providers: {e}"))
}

fn sanitize(p: &ProviderConfig) -> Value {
    json!({
        "id": p.id,
        "label": p.label,
        "providerType": p.provider_type,
        "baseUrl": p.base_url,
        "apiKey": p.api_key.as_deref().unwrap_or(""),
        "model": p.model,
        "extraHeadersJson": p.extra_headers_json,
        "temperature": p.temperature,
        "maxTokens": p.max_tokens,
        "isDefault": p.is_default,
        "isVerified": false
    })
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
async fn open_external(app: AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Only http(s) URLs may be opened externally.".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_providers_file(app: AppHandle) -> Result<String, String> {
    let providers = read_providers(&app)?;
    serde_json::to_string(&providers).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_providers_file(app: AppHandle, json: String) -> Result<(), String> {
    let providers: Vec<ProviderConfig> =
        serde_json::from_str(&json).map_err(|e| format!("Invalid providers payload: {e}"))?;
    write_providers(&app, &providers)
}

#[tauri::command]
fn create_provider(app: AppHandle, input: NewProviderInput) -> Result<Value, String> {
    let mut providers = read_providers(&app)?;
    if input.is_default.unwrap_or(false) || providers.is_empty() {
        for p in providers.iter_mut() {
            p.is_default = false;
        }
    }
    let provider = ProviderConfig {
        id: format!("provider-{}-{}", chrono_now_ms(), rand_suffix()),
        label: input.label,
        provider_type: input.provider_type,
        base_url: input.base_url,
        api_key: Some(input.api_key),
        model: input.model,
        extra_headers_json: None,
        temperature: None,
        max_tokens: None,
        is_default: input.is_default.unwrap_or(false) || providers.is_empty(),
    };
    let sanitized = sanitize(&provider);
    providers.push(provider);
    write_providers(&app, &providers)?;
    Ok(sanitized)
}

#[tauri::command]
fn delete_provider(app: AppHandle, id: String) -> Result<(), String> {
    let mut providers = read_providers(&app)?;
    providers.retain(|p| p.id != id);
    write_providers(&app, &providers)
}

fn chrono_now_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn rand_suffix() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{n:x}")
}

// ---------------------------------------------------------------------------
// AI generation (mirrors server.ts /api/ai/generate, including SSE support)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct AiGenerateResult {
    result: String,
    provider_model: Option<String>,
}

fn parse_completion_body(body: &str, anthropic: bool) -> String {
    let trimmed = body.trim_start();
    if trimmed.starts_with("data:") {
        let mut out = String::new();
        for line in body.lines() {
            let line = line.trim();
            if let Some(payload) = line.strip_prefix("data:") {
                let payload = payload.trim();
                if payload.is_empty() || payload == "[DONE]" {
                    continue;
                }
                if let Ok(obj) = serde_json::from_str::<Value>(payload) {
                    if anthropic {
                        if obj["type"] == "content_block_delta" {
                            if let Some(t) = obj["delta"]["text"].as_str() {
                                out.push_str(t);
                            }
                        }
                    } else if let Some(t) = obj["choices"][0]["delta"]["content"].as_str() {
                        out.push_str(t);
                    } else if let Some(t) = obj["choices"][0]["message"]["content"].as_str() {
                        out.push_str(t);
                    }
                }
            }
        }
        return if out.is_empty() {
            "No response generated.".into()
        } else {
            out
        };
    }

    let data: Value = match serde_json::from_str(trimmed) {
        Ok(v) => v,
        Err(_) => return "No response generated.".into(),
    };
    if anthropic {
        data["content"][0]["text"].as_str().unwrap_or("No response generated.").to_string()
    } else {
        data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("No response generated.")
            .to_string()
    }
}

fn build_extra_headers(provider: &ProviderConfig) -> Vec<(String, String)> {
    let mut headers = Vec::new();
    if let Some(extra) = &provider.extra_headers_json {
        if let Ok(obj) = serde_json::from_str::<Value>(extra) {
            if let Some(map) = obj.as_object() {
                for (k, v) in map {
                    if let Some(s) = v.as_str() {
                        headers.push((k.clone(), s.to_string()));
                    }
                }
            }
        }
    }
    headers
}

#[tauri::command]
async fn ai_generate(
    app: AppHandle,
    provider_id: Option<String>,
    prompt: String,
    context: String,
) -> Result<AiGenerateResult, String> {
    let providers = read_providers(&app)?;
    let provider = providers
        .iter()
        .find(|p| Some(p.id.as_str()) == provider_id.as_deref())
        .or_else(|| providers.iter().find(|p| p.is_default))
        .or_else(|| providers.first())
        .cloned()
        .ok_or("No AI Provider configured. Please add an API key in Settings.")?;

    let api_key = provider.api_key.clone().unwrap_or_default();
    if api_key.is_empty() {
        return Err("Provider has no API key configured.".into());
    }

    let anthropic = provider.provider_type == "anthropic";
    let client = reqwest::Client::new();
    let system_prompt = format!(
        "You are TeXForge AI, an expert LaTeX co-author and debugging assistant embedded in the TeXForge web editor.\n\
         Respond in a helpful, structured teaching style. Follow these rules every time:\n\
         1. Be thorough and concrete: explain the problem briefly, then provide the exact working fix, ready to paste.\n\
         2. Ground your answer in the user's actual document: reference their file names, commands, and citations when they appear in the context, and point out what will fail and why.\n\
         3. Include complete, valid LaTeX code snippets in fenced code blocks (```latex ... ```). Include the surrounding environment when needed so it compiles as-is.\n\
         4. If a fix needs a supporting file (like a .bib, .cls, or .sty), show the minimal full file content, and also offer a simpler alternative that works without that file.\n\
         5. Use short sections and bullet points for readability. Keep prose tight and professional.\n\
         6. Never invent packages or commands that do not exist, and never guess — if something is not in the context, ask for it.\n\
         7. End with a short line inviting the user to tell you what to modify or debug next.\n\
         This is the context: write your answers in the language the user wrote in; if unsure, use English."
    );

    let user_message = format!("{prompt}\n\nContext:\n{context}");

    let response = if anthropic {
        let base = provider.base_url.trim_end_matches('/').to_string();
        let target = if base.ends_with("/v1/messages") { base } else { format!("{base}/v1/messages") };
        let mut request = client.post(target).header("x-api-key", &api_key);
        request = request.header("anthropic-version", "2023-06-01");
        for (k, v) in build_extra_headers(&provider) {
            request = request.header(&k, v);
        }
        request
            .json(&json!({
                "model": provider.model,
                "max_tokens": provider.max_tokens.unwrap_or(1000),
                "system": system_prompt,
                "messages": [{ "role": "user", "content": user_message }]
            }))
            .send()
            .await
            .map_err(|e| format!("AI Provider request failed: {e}"))?
    } else {
        let base = provider.base_url.trim_end_matches('/').to_string();
        let target = if base.ends_with("/chat/completions") {
            base
        } else {
            format!("{base}/chat/completions")
        };
        let mut request = client.post(target).bearer_auth(&api_key);
        for (k, v) in build_extra_headers(&provider) {
            request = request.header(&k, v);
        }
        request
            .json(&json!({
                "model": provider.model,
                "messages": [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": user_message }
                ],
                "temperature": provider.temperature.unwrap_or(0.3),
                "max_tokens": provider.max_tokens.unwrap_or(1000)
            }))
            .send()
            .await
            .map_err(|e| format!("AI Provider request failed: {e}"))?
    };

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        let trimmed = body.chars().take(500).collect::<String>();
        return Err(format!("AI Provider error ({status}): {trimmed}"));
    }

    let body = response.text().await.map_err(|e| e.to_string())?;
    let answer = parse_completion_body(&body, anthropic);
    Ok(AiGenerateResult {
        result: answer,
        provider_model: Some(provider.model),
    })
}

#[derive(Serialize)]
struct TestResult {
    latency_ms: u64,
    message: String,
}

#[tauri::command]
async fn ai_test_provider(app: AppHandle, provider_id: String) -> Result<TestResult, String> {
    let providers = read_providers(&app)?;
    let provider = providers
        .iter()
        .find(|p| p.id == provider_id)
        .ok_or("AI Provider configuration not found.")?;
    let api_key = provider.api_key.clone().unwrap_or_default();
    if api_key.is_empty() {
        return Err("Provider has no API key configured.".into());
    }

    let start = Instant::now();
    let client = reqwest::Client::new();

    let response = if provider.provider_type == "anthropic" {
        let base = provider.base_url.trim_end_matches('/').to_string();
        let target = if base.ends_with("/v1/messages") { base } else { format!("{base}/v1/messages") };
        client
            .post(target)
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": provider.model,
                "max_tokens": 5,
                "messages": [{ "role": "user", "content": "Ping test" }]
            }))
            .send()
            .await
            .map_err(|e| format!("Connection failed: {e}"))?
    } else {
        let base = provider.base_url.trim_end_matches('/').to_string();
        let target = if base.ends_with("/chat/completions") {
            base
        } else {
            format!("{base}/chat/completions")
        };
        client
            .post(target)
            .bearer_auth(&api_key)
            .json(&json!({
                "model": provider.model,
                "messages": [{ "role": "user", "content": "Ping test" }],
                "max_tokens": 5
            }))
            .send()
            .await
            .map_err(|e| format!("Connection failed: {e}"))?
    };

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        let trimmed = body.chars().take(500).collect::<String>();
        return Err(format!("Provider API error ({status}): {trimmed}"));
    }

    Ok(TestResult {
        latency_ms: start.elapsed().as_millis() as u64,
        message: "✓ Connected — ready to use".into(),
    })
}

// ---------------------------------------------------------------------------
// Native file dialogs (ZIP import/export)
// ---------------------------------------------------------------------------

fn file_path_to_string(p: FilePath) -> Option<PathBuf> {
    match p {
        FilePath::Path(p) => Some(p),
        FilePath::Url(_) => None,
    }
}

#[tauri::command]
async fn pick_import_zip(app: AppHandle) -> Result<Option<Value>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("ZIP Archive", &["zip"])
        .blocking_pick_file();
    let Some(path) = picked.and_then(file_path_to_string) else {
        return Ok(None);
    };
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "project.zip".into());
    Ok(Some(json!({
        "name": name,
        "dataBase64": B64.encode(bytes)
    })))
}

#[tauri::command]
async fn pick_export_zip(app: AppHandle, data_base64: String, suggested_name: String) -> Result<bool, String> {
    let picked = app
        .dialog()
        .file()
        .set_file_name(&suggested_name)
        .add_filter("ZIP Archive", &["zip"])
        .blocking_save_file();
    let Some(path) = picked.and_then(file_path_to_string) else {
        return Ok(false);
    };
    let bytes = B64
        .decode(data_base64)
        .map_err(|e| format!("Failed to decode zip data: {e}"))?;
    fs::write(&path, bytes).map_err(|e| format!("Failed to write file: {e}"))?;
    Ok(true)
}

// ---------------------------------------------------------------------------
// Native menu
// ---------------------------------------------------------------------------

fn emit_menu(app: &AppHandle, event_type: &str) {
    let _ = app.emit("menu://event", json!({ "type": event_type }));
}

fn build_menu(app: &AppHandle) -> Result<Menu<Wry>, tauri::Error> {
    let file_menu = SubmenuBuilder::new(app, "File")
        .text("file-import", "Import ZIP Project…")
        .text("file-export", "Export Project as ZIP…")
        .separator()
        .item(&MenuItemBuilder::with_id("file-quit", "Quit").accelerator("Ctrl+Q").build(app)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .text("edit-undo", "Undo")
        .text("edit-redo", "Redo")
        .separator()
        .text("edit-cut", "Cut")
        .text("edit-copy", "Copy")
        .text("edit-paste", "Paste")
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .text("view-terminal", "Toggle Terminal")
        .item(&MenuItemBuilder::with_id("view-ai", "Toggle AI Helper").accelerator("Ctrl+Shift+A").build(app)?)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .text("help-shortcuts", "Keyboard Shortcuts")
        .separator()
        .text("help-about", "About TeXForge")
        .build()?;

    MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &view_menu, &help_menu])
        .build()
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_version,
            open_external,
            read_providers_file,
            write_providers_file,
            create_provider,
            delete_provider,
            ai_generate,
            ai_test_provider,
            pick_import_zip,
            pick_export_zip,
        ])
        .setup(|app| {
            app.set_menu(build_menu(app.handle())?)?;
            app.on_menu_event(|app, event| {
                let t = match event.id().as_ref() {
                    "file-import" => "import-zip",
                    "file-export" => "export-zip",
                    "file-quit" => {
                        app.exit(0);
                        return;
                    }
                    "edit-undo" => "edit-undo",
                    "edit-redo" => "edit-redo",
                    "edit-cut" => "edit-cut",
                    "edit-copy" => "edit-copy",
                    "edit-paste" => "edit-paste",
                    "view-terminal" => "toggle-pdf",
                    "view-ai" => "toggle-ai",
                    "help-shortcuts" => "shortcuts",
                    "help-about" => "about",
                    _ => return,
                };
                emit_menu(app, t);
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let _ = window.app_handle().emit("menu://event", json!({ "type": "app-close" }));
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running TeXForge desktop");
}

