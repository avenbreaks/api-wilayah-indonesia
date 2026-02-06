API Data Wilayah Indonesia
==========================

Repository ini berisi source code untuk generate (REST) API statis berisi data wilayah Indonesia
dengan dukungan deployment ke **Cloudflare Worker**.

Demo: [https://api-wilayah-indonesia.workers.dev](https://api-wilayah-indonesia.workers.dev)

## Fitur

- API statis dengan performa tinggi menggunakan Cloudflare KV
- CORS enabled - dapat diakses dari domain manapun
- Cache optimized - response time < 50ms globally
- Auto-deploy via GitHub Actions

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                  │
│  ┌─────────────────┐        ┌─────────────────────────────┐ │
│  │ Cloudflare      │───────▶│   Cloudflare KV Storage     │ │
│  │ Worker          │        │   - API JSON data           │ │
│  │ (src/index.js)  │        │   - Static assets           │ │
│  └─────────────────┘        └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP Request
                              │
                        ┌─────┴─────┐
                        │  Client   │
                        └───────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18
- PHP >= 7.4 (untuk generate data)
- Cloudflare account
- Wrangler CLI

### Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/avenbreaks/api-wilayah-indonesia.git
   cd api-wilayah-indonesia
   ```

2. **Install dependencies**
   ```bash
   composer install
   cd worker && npm install
   ```

3. **Login ke Cloudflare**
   ```bash
   npx wrangler login
   ```

4. **Buat KV Namespace**
   ```bash
   npm run kv:create
   ```
   
   Copy ID yang dihasilkan dan update `worker/wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "WILAYAH_KV"
   id = "YOUR_KV_NAMESPACE_ID"
   ```

5. **Generate data API**
   ```bash
   php generate.php
   ```

6. **Seed data ke KV**
   ```bash
   cd worker
   npm run seed
   ```

7. **Deploy**
   ```bash
   npm run deploy
   ```

## Development

### Local Development
```bash
cd worker
npm run dev
```

Worker akan berjalan di `http://localhost:8787`

### Generate ulang data
```bash
php generate.php
npm run seed  # di folder worker
```

## ENDPOINTS

#### 1. Mengambil Daftar Provinsi

```
GET https://api-wilayah-indonesia.workers.dev/api/provinces.json
```

Contoh Response:

```json
[
  {
    "id": "11",
    "name": "ACEH"
  },
  {
    "id": "12",
    "name": "SUMATERA UTARA"
  }
]
```

#### 2. Mengambil Daftar Kab/Kota pada Provinsi Tertentu

```
GET https://api-wilayah-indonesia.workers.dev/api/regencies/{provinceId}.json
```

Contoh untuk mengambil daftar kab/kota di provinsi Aceh (ID = 11):

```
GET https://api-wilayah-indonesia.workers.dev/api/regencies/11.json
```

Contoh Response:

```json
[
  {
    "id": "1101",
    "province_id": "11",
    "name": "KABUPATEN SIMEULUE"
  },
  {
    "id": "1102",
    "province_id": "11",
    "name": "KABUPATEN ACEH SINGKIL"
  }
]
```

#### 3. Mengambil Daftar Kecamatan pada Kab/Kota Tertentu

```
GET https://api-wilayah-indonesia.workers.dev/api/districts/{regencyId}.json
```

Contoh untuk mengambil daftar kecamatan di Aceh Selatan (ID = 1103):

```
GET https://api-wilayah-indonesia.workers.dev/api/districts/1103.json
```

Contoh Response:

```json
[
  {
    "id": "1103010",
    "regency_id": "1103",
    "name": "TRUMON"
  },
  {
    "id": "1103011",
    "regency_id": "1103",
    "name": "TRUMON TIMUR"
  }
]
```

#### 4. Mengambil Daftar Kelurahan pada Kecamatan Tertentu

```
GET https://api-wilayah-indonesia.workers.dev/api/villages/{districtId}.json
```

Contoh untuk mengambil daftar kelurahan di Trumon (ID = 1103010):

```
GET https://api-wilayah-indonesia.workers.dev/api/villages/1103010.json
```

Contoh Response:

```json
[
  {
    "id": "1103010001",
    "district_id": "1103010",
    "name": "KUTA PADANG"
  },
  {
    "id": "1103010002",
    "district_id": "1103010",
    "name": "RAKET"
  }
]
```

#### 5. Mengambil Data Provinsi berdasarkan ID Provinsi

```
GET https://api-wilayah-indonesia.workers.dev/api/province/{provinceId}.json
```

#### 6. Mengambil Data Kab/Kota berdasarkan ID Kab/Kota

```
GET https://api-wilayah-indonesia.workers.dev/api/regency/{regencyId}.json
```

#### 7. Mengambil Data Kecamatan berdasarkan ID Kecamatan

```
GET https://api-wilayah-indonesia.workers.dev/api/district/{districtId}.json
```

#### 8. Mengambil Data Kelurahan berdasarkan ID Kelurahan

```
GET https://api-wilayah-indonesia.workers.dev/api/village/{villageId}.json
```

## GitHub Actions Deployment

Repository ini sudah dikonfigurasi untuk auto-deploy menggunakan GitHub Actions.

### Setup Secrets

Tambahkan secrets berikut di repository GitHub:

1. `CLOUDFLARE_API_TOKEN` - API token dengan permission:
   - Account: Workers KV Storage:Edit
   - Account: Workers Scripts:Edit

2. `CLOUDFLARE_ACCOUNT_ID` - Account ID Cloudflare Anda

### Trigger Deploy

Deploy otomatis akan berjalan ketika:
- Push ke branch `master`
- Perubahan pada folder `data/`, `worker/`, atau `static/`
- Manual trigger via workflow_dispatch

## Struktur Project

```
api-wilayah-indonesia/
├── data/                    # Data CSV wilayah
│   ├── provinces.csv
│   ├── regencies.csv
│   ├── districts.csv
│   └── villages.csv
├── src/                     # PHP source untuk generate
│   ├── Generator.php
│   ├── Helper.php
│   └── Repository.php
├── static/                  # Static assets & generated API
│   ├── api/                 # Generated JSON files
│   ├── css/
│   ├── js/
│   ├── img/
│   └── index.html
├── worker/                  # Cloudflare Worker
│   ├── src/
│   │   └── index.js         # Worker entry point
│   ├── scripts/
│   │   └── seed-kv.js       # Script untuk seed data ke KV
│   ├── package.json
│   └── wrangler.toml        # Wrangler config
├── .github/
│   └── workflows/
│       └── deploy-cf-worker.yml
├── generate.php             # Script generate API
└── README.md
```

## Performa

Dengan Cloudflare Worker + KV:
- **Latency**: < 50ms globally
- **Availability**: 99.99% uptime
- **Bandwidth**: Unlimited (free tier: 100k requests/day)

## Limitasi Cloudflare Free Tier

- 100,000 requests/day
- 10ms CPU time per request
- 1GB KV storage

Untuk produksi dengan traffic tinggi, pertimbangkan upgrade ke Cloudflare Workers Paid plan.

## Self-hosting

Jika ingin hosting sendiri:

1. Fork repository ini
2. Setup secrets di GitHub repository settings
3. Update `wrangler.toml` dengan KV namespace ID Anda
4. Push ke branch master untuk trigger deployment

## Credits

- Data wilayah: [Kementerian Dalam Negeri](https://www.kemendagri.go.id/)
- Original project: [emsifa/api-wilayah-indonesia](https://github.com/emsifa/api-wilayah-indonesia)

## License

ISC
