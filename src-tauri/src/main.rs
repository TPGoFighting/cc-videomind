// Prevents an extra console window on Windows in release. Set in Cargo.toml
// via the `windows_subsystem` attribute for release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    teachplayer_lib::run()
}
