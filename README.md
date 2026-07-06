# PRD: Backend Automation & Scraper Engine untuk TikTok GMV Max Journey

## 1. Goal
Membangun backend service menggunakan [Node.js / Python] untuk menjalankan Playwright automation yang menangkap data iklan TikTok (Search & FYP) dan menyimpannya ke database PostgreSQL.

## 2. Tech Stack
- Language: [Node.js (TypeScript) / Python (FastAPI)]
- Browser Automation: Playwright (dengan playwright-stealth)
- Database: PostgreSQL
- ORM/Driver: [Prisma / Sequelize / SQLAlchemy]
- Environment: Local (development), Docker (deployment ready)

## 3. Database Schema (PostgreSQL)
Tolong buatkan skema tabel untuk:
- `products`: id, product_id, shop_id, name, niche, price, created_at.
- `creators`: id, creator_id, username, follower_count.
- `ad_exposures`: id, product_id, exposure_type (Search/FYP/Affiliate), keyword, is_paid_ad, created_at.
- Buat relasi antar tabel tersebut agar bisa melakukan JOIN.

## 4. Komponen Utama Backend
1. **Scraper Engine**:
   - Inisialisasi browser dengan stealth plugin.
   - Fungsi untuk rotasi User-Agent dan simulasi human behavior (random mouse movement & scroll).
2. **Network Interceptor**:
   - Mencegat request API TikTok (`page.on('response')`).
   - Filter endpoint: `/api/search/item/` dan `/api/recommend/item_list/`.
   - Parse JSON response menjadi data terstruktur (Product ID, Ad Status).
3. **Core Workflow (Journey Runner)**:
   - Step 1: Buka TikTok, cari keyword niche.
   - Step 2: Loop scroll di FYP untuk menemukan Sponsored Ads.
   - Step 3: Validasi apakah produk tersebut muncul di profil 3 kreator afiliasi berbeda.
4. **API / Controller**:
   - Endpoint sederhana untuk memicu proses scraping (`POST /start-scrape`).
   - Endpoint untuk menarik data dari DB (`GET /api/reports`).

## 5. Requirements Keamanan (Anti-Ban)
- Jangan gunakan headless mode secara default (beri opsi headed untuk debugging).
- Implementasikan random delay (1-5 detik) antar aksi.
- Gunakan `context` baru setiap session agar cookies dan cache tidak tumpang tindih.

## 6. Output yang Diharapkan
- Struktur project yang rapi (folder `src`, `db`, `config`).
- File `Dockerfile` agar bisa dideploy ke VPS di masa depan.
- Script migrasi database `.sql`.

Tolong lihat struktur folder saya dan analisis apakah sudah sesuai untuk mulai dengan membuat struktur folder dan file skema database.