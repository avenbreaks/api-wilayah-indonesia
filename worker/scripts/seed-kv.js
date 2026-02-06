#!/usr/bin/env node

/**
 * Script untuk seed data ke Cloudflare KV
 * 
 * Cara penggunaan:
 * 1. Pastikan wrangler sudah login: wrangler login
 * 2. Pastikan KV namespace sudah dibuat
 * 3. Update wrangler.toml dengan KV namespace ID
 * 4. Jalankan: node scripts/seed-kv.js
 * 
 * Opsi:
 *   --preview    Seed ke preview namespace
 *   --namespace  Custom namespace ID
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse arguments
const args = process.argv.slice(2);
const isPreview = args.includes('--preview');
const namespaceIndex = args.indexOf('--namespace');
let namespaceId = namespaceIndex !== -1 ? args[namespaceIndex + 1] : null;

// Paths
const rootDir = join(__dirname, '..', '..');
const staticDir = join(rootDir, 'static');
const apiDir = join(staticDir, 'api');

// Wrangler config
const wranglerConfig = join(__dirname, '..', 'wrangler.toml');

/**
 * Read namespace ID from wrangler.toml if not provided
 */
function getNamespaceId() {
  if (namespaceId) return namespaceId;
  
  try {
    const config = readFileSync(wranglerConfig, 'utf8');
    // Look for KV namespace ID (after [[kv_namespaces]] block)
    const kvMatch = config.match(/\[\[kv_namespaces\]\][\s\S]*?id\s*=\s*"([^"]+)"/);
    if (kvMatch) return kvMatch[1];
  } catch (e) {
    console.error('Error reading wrangler.toml:', e.message);
  }
  
  throw new Error('KV namespace ID tidak ditemukan. Gunakan --namespace atau update wrangler.toml');
}

/**
 * Upload single key-value to KV
 */
function uploadToKV(key, value, isJson = true) {
  const nsId = getNamespaceId();
  const previewFlag = isPreview ? '--preview' : '';
  
  // Use wrangler kv key put
  const cmd = `wrangler kv key put "${key}" '${typeof value === 'string' ? value.replace(/'/g, "'\\''") : JSON.stringify(value)}' --namespace-id=${nsId} ${previewFlag}`;
  
  try {
    execSync(cmd, { 
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
    return true;
  } catch (e) {
    console.error(`Error uploading ${key}:`, e.message);
    return false;
  }
}

/**
 * Bulk upload using wrangler kv:bulk
 */
function bulkUploadToKV(entries) {
  const nsId = getNamespaceId();
  const previewFlag = isPreview ? '--preview' : '';
  const tempFile = join(__dirname, 'temp-bulk.json');
  
  // Write entries to temp file
  writeFileSync(tempFile, JSON.stringify(entries));
  
  const cmd = `wrangler kv bulk put "${tempFile}" --namespace-id=${nsId} --remote ${previewFlag}`;
  
  try {
    execSync(cmd, { 
      cwd: join(__dirname, '..'),
      stdio: 'inherit'
    });
    unlinkSync(tempFile);
    return true;
  } catch (e) {
    unlinkSync(tempFile);
    throw e;
  }
}

/**
 * Read and process all API JSON files
 */
function collectApiData() {
  const entries = [];
  
  // Read provinces
  const provincesFile = join(apiDir, 'provinces.json');
  if (existsSync(provincesFile)) {
    const data = JSON.parse(readFileSync(provincesFile, 'utf8'));
    entries.push({ key: 'api:provinces', value: JSON.stringify(data) });
    console.log('  - provinces.json');
  }
  
  // Process directory recursively
  function processDir(dir, prefix = '') {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        processDir(fullPath, `${prefix}${item}/`);
      } else if (item.endsWith('.json')) {
        const data = JSON.parse(readFileSync(fullPath, 'utf8'));
        const key = `api:${prefix}${item.replace('.json', '')}`;
        entries.push({ key, value: JSON.stringify(data) });
      }
    }
  }
  
  // Process regencies, districts, villages, province, regency, district, village
  const dirs = ['regencies', 'districts', 'villages', 'province', 'regency', 'district', 'village'];
  
  for (const dir of dirs) {
    const dirPath = join(apiDir, dir);
    if (existsSync(dirPath)) {
      console.log(`  - ${dir}/`);
      processDir(dirPath, `${dir}/`);
    }
  }
  
  return entries;
}

/**
 * Collect static assets (HTML, CSS, JS, images)
 */
function collectStaticAssets() {
  const entries = [];
  
  // index.html
  const indexFile = join(staticDir, 'index.html');
  if (existsSync(indexFile)) {
    entries.push({
      key: 'static:index.html',
      value: readFileSync(indexFile, 'utf8')
    });
    console.log('  - index.html');
  }
  
  // CSS files
  const cssDir = join(staticDir, 'css');
  if (existsSync(cssDir)) {
    const files = readdirSync(cssDir);
    for (const file of files) {
      if (file.endsWith('.css')) {
        entries.push({
          key: `static:css/${file}`,
          value: readFileSync(join(cssDir, file), 'utf8')
        });
        console.log(`  - css/${file}`);
      }
    }
  }
  
  // JS files
  const jsDir = join(staticDir, 'js');
  if (existsSync(jsDir)) {
    const files = readdirSync(jsDir);
    for (const file of files) {
      if (file.endsWith('.js')) {
        entries.push({
          key: `static:js/${file}`,
          value: readFileSync(join(jsDir, file), 'utf8')
        });
        console.log(`  - js/${file}`);
      }
    }
  }
  
  return entries;
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(50));
  console.log('Seed Data ke Cloudflare KV');
  console.log('='.repeat(50));
  console.log(`Mode: ${isPreview ? 'Preview' : 'Production'}`);
  console.log('');
  
  // Check if static directory exists
  if (!existsSync(staticDir)) {
    console.error('Error: Folder static/ tidak ditemukan.');
    console.error('Jalankan "php generate.php" terlebih dahulu untuk generate data API.');
    process.exit(1);
  }
  
  console.log('Mengumpulkan data API...');
  const apiEntries = collectApiData();
  console.log(`Total: ${apiEntries.length} file API\n`);
  
  console.log('Mengumpulkan static assets...');
  const staticEntries = collectStaticAssets();
  console.log(`Total: ${staticEntries.length} static files\n`);
  
  const allEntries = [...apiEntries, ...staticEntries];
  console.log(`Total keseluruhan: ${allEntries.length} entries\n`);
  
  // Split into chunks of 10000 (KV bulk limit)
  const CHUNK_SIZE = 10000;
  const chunks = [];
  for (let i = 0; i < allEntries.length; i += CHUNK_SIZE) {
    chunks.push(allEntries.slice(i, i + CHUNK_SIZE));
  }
  
  console.log(`Upload dalam ${chunks.length} batch...`);
  
  const tempFile = join(__dirname, 'temp-bulk.json');
  const nsId = getNamespaceId();
  const previewFlag = isPreview ? '--preview' : '';
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`\nBatch ${i + 1}/${chunks.length} (${chunks[i].length} entries)...`);
    
    // Write to temp file
    writeFileSync(tempFile, JSON.stringify(chunks[i]));
    
  const cmd = `wrangler kv bulk put "${tempFile}" --namespace-id=${nsId} --remote ${previewFlag}`;
    
    try {
      execSync(cmd, { 
        cwd: join(__dirname, '..'),
        stdio: 'inherit'
      });
    } catch (e) {
      console.error(`Error pada batch ${i + 1}:`, e.message);
      unlinkSync(tempFile);
      process.exit(1);
    }
    
    unlinkSync(tempFile);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Seed selesai!');
  console.log('='.repeat(50));
}

main().catch(console.error);
