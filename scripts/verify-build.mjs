import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const colors = {
  error: '\x1b[31m',
  success: '\x1b[32m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  reset: '\x1b[0m',
};

const root = process.cwd();
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');
const assetsDir = path.join(distDir, 'assets');
const failures = [];
const warnings = [];

const log = (kind, text) => {
  const color = colors[kind] ?? colors.info;
  console.log(`${color}${text}${colors.reset}`);
};

const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

log('info', 'Verifying build output...');

if (!existsSync(distDir)) fail('dist/ directory is missing. Run npm run build first.');
if (!existsSync(indexPath)) fail('dist/index.html is missing.');
if (!existsSync(assetsDir)) fail('dist/assets/ directory is missing.');

let html = '';
let assetFiles = [];

if (existsSync(indexPath)) {
  html = readFileSync(indexPath, 'utf8');
  if (!html.includes('id="root"')) {
    fail('dist/index.html does not contain the React #root mount point.');
  }
}

if (existsSync(assetsDir)) {
  assetFiles = readdirSync(assetsDir);
  const jsFiles = assetFiles.filter((file) => file.endsWith('.js'));
  const cssFiles = assetFiles.filter((file) => file.endsWith('.css'));

  if (jsFiles.length === 0) fail('No JavaScript bundle was emitted in dist/assets/.');
  if (cssFiles.length === 0) fail('No CSS bundle was emitted in dist/assets/.');

  for (const file of jsFiles) {
    const sizeKb = statSync(path.join(assetsDir, file)).size / 1024;
    if (sizeKb > 500) {
      warn(`${file} is ${sizeKb.toFixed(1)} KB. Consider code splitting if this affects loading.`);
    }
  }
}

if (html) {
  const referencedAssets = [...html.matchAll(/(?:src|href)="\/?assets\/([^"]+)"/g)].map((match) => match[1]);
  for (const asset of referencedAssets) {
    if (!existsSync(path.join(assetsDir, asset))) {
      fail(`index.html references missing asset: assets/${asset}`);
    }
  }
}

if (warnings.length > 0) {
  log('warn', '\nWarnings:');
  warnings.forEach((message) => log('warn', `- ${message}`));
}

if (failures.length > 0) {
  log('error', '\nBuild output verification failed:');
  failures.forEach((message) => log('error', `- ${message}`));
  process.exit(1);
}

log('success', 'Build output verification passed.');
