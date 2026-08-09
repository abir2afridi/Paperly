#!/usr/bin/env node
// Copies the Monaco Editor distribution into public/vendor/monaco so the app
// works fully offline (Web + Desktop). Run via: npm run vendor:monaco
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const src = path.join(root, 'node_modules', 'monaco-editor', 'min', 'vs');
const dest = path.join(root, 'public', 'vendor', 'monaco');

if (!fs.existsSync(src)) {
  console.error('[vendor:monaco] monaco-editor not found in node_modules. Run npm install first.');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[vendor:monaco] Copied ${src} -> ${dest}`);
