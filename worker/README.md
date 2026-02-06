# Cloudflare Worker - API Wilayah Indonesia

Worker ini menyediakan API statis data wilayah Indonesia dengan performa tinggi menggunakan Cloudflare KV.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Login ke Cloudflare

```bash
npx wrangler login
```

### 3. Buat KV Namespace

```bash
# Production
npm run kv:create

# Preview (untuk development)
npm run kv:create:preview
```

Output akan menampilkan namespace ID. Update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "WILAYAH_KV"
id = "YOUR_PRODUCTION_KV_ID"
preview_id = "YOUR_PREVIEW_KV_ID"
```

### 4. Generate & Seed Data

Pastikan data API sudah di-generate:

```bash
# Di root folder
php generate.php

# Kembali ke folder worker
cd worker
npm run seed
```

### 5. Development

```bash
npm run dev
```

Worker akan berjalan di `http://localhost:8787`

### 6. Deploy

```bash
npm run deploy
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start local development server |
| `npm run deploy` | Deploy ke production |
| `npm run kv:create` | Buat KV namespace baru |
| `npm run seed` | Seed data API ke KV |
| `npm run seed:preview` | Seed data ke preview KV |

## Struktur

```
worker/
├── src/
│   └── index.js      # Worker entry point
├── scripts/
│   └── seed-kv.js    # Script seed data ke KV
├── package.json
├── wrangler.toml     # Konfigurasi Wrangler
└── README.md
```

## Arsitektur Worker

```
Request ───▶ Worker ───▶ Route Parser ───▶ API Handler ───▶ KV Get ───▶ Response
                                      └───▶ Static Handler ───▶ KV Get ───▶ Response
```

### Routes

| Pattern | Handler | KV Key Format |
|---------|---------|---------------|
| `/api/provinces.json` | API | `api:provinces` |
| `/api/regencies/{id}.json` | API | `api:regencies/{id}` |
| `/api/districts/{id}.json` | API | `api:districts/{id}` |
| `/api/villages/{id}.json` | API | `api:villages/{id}` |
| `/api/province/{id}.json` | API | `api:province/{id}` |
| `/api/regency/{id}.json` | API | `api:regency/{id}` |
| `/api/district/{id}.json` | API | `api:district/{id}` |
| `/api/village/{id}.json` | API | `api:village/{id}` |
| `/` atau `/index.html` | Static | `static:index.html` |
| `/css/*` | Static | `static:css/*` |
| `/js/*` | Static | `static:js/*` |
| `/img/*` | Static | `static:img/*` |

## Headers

Semua response menyertakan:

- `Access-Control-Allow-Origin: *` (CORS)
- `Cache-Control` yang sesuai

| Content Type | Cache Duration |
|--------------|----------------|
| JSON | 1 day (CDN: 7 days) |
| HTML | 1 hour |
| CSS/JS | 1 day |
| Images | 7 days |
