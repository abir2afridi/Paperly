#!/usr/bin/env node
// Keeps src-tauri/tauri.conf.json version in sync with package.json version
// (single source of truth for the app version). Run via: npm run sync:tauri-conf
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const confPath = path.join(root, 'src-tauri', 'tauri.conf.json');
const cargoPath = path.join(root, 'src-tauri', 'Cargo.toml');

if (fs.existsSync(confPath)) {
  const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
  if (conf.version !== pkg.version) {
    conf.version = pkg.version;
    fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n', 'utf8');
    console.log(`[sync:tauri-conf] tauri.conf.json version synced to ${pkg.version}`);
  } else {
    console.log(`[sync:tauri-conf] tauri.conf.json version already ${pkg.version}`);
  }
} else {
  console.warn('[sync:tauri-conf] src-tauri/tauri.conf.json not found — skipped.');
}

if (fs.existsSync(cargoPath)) {
  const cargo = fs.readFileSync(cargoPath, 'utf8');
  const updated = cargo.replace(/^version = ".*"$/m, `version = "${pkg.version}"`);
  if (updated !== cargo) {
    fs.writeFileSync(cargoPath, updated, 'utf8');
    console.log(`[sync:tauri-conf] Cargo.toml version synced to ${pkg.version}`);
  } else {
    console.log(`[sync:tauri-conf] Cargo.toml version already ${pkg.version}`);
  }
}
