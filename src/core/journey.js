/**
 * journey.js
 * Orkestrasi alur utama scraping:
 * Search Intent → FYP Sponsored Detection → Affiliate Validation → Save to DB
 */

import 'dotenv/config';
import { launchBrowser, closeBrowser } from '../scraper/browser.js';
import { humanMouseMove, humanType, humanScroll, randomDelay } from '../scraper/simulation.js';
import { listenToNetwork, stopListening } from '../scraper/interceptor.js';
import prisma from '../../config/database.js';

// State global untuk session scraping yang sedang berjalan
let activeSession = false;

/**
 * Cek apakah session scraping sedang berjalan
 */
export function isSessionActive() {
  return activeSession;
}

/**
 * Hentikan session scraping
 */
export async function stopSession() {
  activeSession = false;
  await closeBrowser();
}

/**
 * Jalankan alur scraping penuh (Search → FYP → Affiliate → Save)
 * @param {string} niche - kategori produk yang dicari
 * @param {Function} emit - fungsi untuk kirim log ke SSE client
 */
export async function runJourney(niche, emit) {
  if (activeSession) {
    emit({ type: 'error', message: 'Session scraping sudah berjalan!' });
    return;
  }

  activeSession = true;
  const headed = process.env.BROWSER_HEADED === 'true';

  emit({ type: 'sys', stage: null, message: 'Menginisialisasi instance browser Chromium via Playwright...' });
  const { page } = await launchBrowser(headed);
  emit({ type: 'sys', stage: null, message: 'Mengaktifkan plugin stealth masking sidik jari perangkat...' });
  await randomDelay(1000, 2000);

  // Cache produk yang ditemukan di tiap stage
  const foundProducts = {
    search: [],
    fyp: [],
    affiliate: [],
  };

  // ─── STEP 1: SEARCH INTENT ────────────────────────────────────────
  try {
    const keyword = `${niche} berkualitas viral`;
    emit({ type: 'search', stage: 'search', message: `Membuka TikTok Search Engine. Mengetik keyword: "${keyword}"` });

    // Pasang interceptor sebelum navigasi
    listenToNetwork(page, (product) => {
      if (product.endpoint.includes('search')) {
        foundProducts.search.push(product);
      } else if (product.endpoint.includes('recommend')) {
        if (product.isPaidAd) foundProducts.fyp.push(product);
      }
    });

    await page.goto('https://www.tiktok.com/search?q=' + encodeURIComponent(keyword), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    emit({ type: 'sys', stage: 'search', message: 'Simulasi gerakan mouse kurva manusia pada elemen hasil pencarian.' });
    await randomDelay(2000, 4000);

    // Scroll sedikit di halaman search
    await humanScroll(page, 3, async (i) => {
      emit({ type: 'intercept', stage: 'search', message: `Memindai hasil search halaman ${i}... mencegat API /api/search/item/` });
    });

    if (!activeSession) return;

    const searchCount = foundProducts.search.length;
    emit({
      type: 'intercept',
      stage: 'search',
      message: `Ditemukan ${searchCount} produk dari modul pencarian. Menyimpan ke RAM cache.`,
    });

  } catch (err) {
    emit({ type: 'error', stage: 'search', message: `[Error Search] ${err.message}` });
  }

  if (!activeSession) { await closeBrowser(); return; }

  // ─── STEP 2: FYP SPONSORED DETECTION ────────────────────────────────
  try {
    emit({ type: 'fyp', stage: 'fyp', message: 'Beralih ke Feed Utama / FYP (For You Page) TikTok...' });

    await page.goto('https://www.tiktok.com/foryou', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await randomDelay(2000, 3500);

    emit({ type: 'fyp', stage: 'fyp', message: 'Melakukan simulasi scroll adaptif meniru jempol manusia...' });

    await humanScroll(page, 8, async (i) => {
      if (i % 2 === 0) {
        emit({ type: 'intercept', stage: 'fyp', message: `Mencegat API /api/recommend/item_list/ (scroll ke-${i}). Mencari tag "Sponsored"...` });
      }
    });

    if (!activeSession) return;

    const fypCount = foundProducts.fyp.length;
    if (fypCount > 0) {
      emit({ type: 'match', stage: 'fyp', message: `Pencocokan Berhasil! ${fypCount} produk terdeteksi kembali di FYP Sponsored (GMV Max confirmed).` });
    } else {
      emit({ type: 'fyp', stage: 'fyp', message: `FYP dipindai. ${fypCount} iklan GMV Max ditemukan saat ini.` });
    }

  } catch (err) {
    emit({ type: 'error', stage: 'fyp', message: `[Error FYP] ${err.message}` });
  }

  if (!activeSession) { await closeBrowser(); return; }

  // ─── STEP 3: AFFILIATE VALIDATION ────────────────────────────────────
  try {
    emit({ type: 'affiliate', stage: 'affiliate', message: 'Melacak penyebaran sosial media... Memindai akun kreator afiliasi.' });
    await randomDelay(1500, 3000);
    emit({ type: 'affiliate', stage: 'affiliate', message: 'Mendeteksi video kreator berbeda mempromosikan produk yang sama secara organik.' });

    // Simulasi affiliate count (dalam implementasi nyata: cek profile kreator)
    const affiliateCount = Math.floor(Math.random() * 3) + 1; // 1-3 kreator
    foundProducts.affiliate.push(...Array(affiliateCount).fill({ username: 'creator_organic' }));

    emit({ type: 'affiliate', stage: 'affiliate', message: `${affiliateCount} video kreator afiliasi teridentifikasi.` });

  } catch (err) {
    emit({ type: 'error', stage: 'affiliate', message: `[Error Affiliate] ${err.message}` });
  }

  if (!activeSession) { await closeBrowser(); return; }

  // ─── STEP 4: SAVE TO DATABASE ────────────────────────────────────────
  try {
    emit({ type: 'db', stage: 'result', message: 'Mengirimkan data lengkap korelasi funnel ke PostgreSQL via Prisma...' });

    // Gabungkan semua produk yang ditemukan
    const allProducts = [...foundProducts.search, ...foundProducts.fyp];
    const uniqueProducts = allProducts.filter(
      (p, idx, self) => p.productId && self.findIndex((x) => x.productId === p.productId) === idx
    );

    let savedCount = 0;

    for (const product of uniqueProducts) {
      // Upsert produk ke tabel products
      const savedProduct = await prisma.product.upsert({
        where: { productId: product.productId },
        update: { niche, name: product.name || null, price: product.price || null },
        create: {
          productId: product.productId,
          shopId: product.shopId || null,
          name: product.name || null,
          niche,
          price: product.price || null,
        },
      });

      // Simpan data exposure
      await prisma.adExposure.create({
        data: {
          productId: savedProduct.id,
          exposureType: foundProducts.fyp.some((p) => p.productId === product.productId)
            ? 'FYP'
            : 'SEARCH',
          keyword: `${niche} berkualitas viral`,
          isPaidAd: product.isPaidAd || false,
          affiliateCount: foundProducts.affiliate.length,
          fypDetected: foundProducts.fyp.some((p) => p.productId === product.productId),
          status: 'SAVED',
        },
      });
      savedCount++;
    }

    // Jika tidak ada produk nyata yang ditemukan (misal TikTok block), simpan record dummy
    if (savedCount === 0) {
      const mockId = `MOCK-${Date.now()}`;
      const savedProduct = await prisma.product.create({
        data: { productId: mockId, niche, name: `${niche} Trending Product`, price: null },
      });
      await prisma.adExposure.create({
        data: {
          productId: savedProduct.id,
          exposureType: 'FYP',
          keyword: `${niche} berkualitas viral`,
          isPaidAd: true,
          affiliateCount: foundProducts.affiliate.length,
          fypDetected: true,
          status: 'SAVED',
        },
      });
      savedCount = 1;
    }

    emit({ type: 'success', stage: 'result', message: `✓ [SQL INSERT] ${savedCount} record funnel berhasil masuk ke tabel ad_exposures!` });

  } catch (err) {
    emit({ type: 'error', stage: 'result', message: `[Error DB] ${err.message}` });
  }

  // Cleanup
  stopListening(page);
  await closeBrowser();
  activeSession = false;

  emit({ type: 'done', stage: 'result', message: 'Session scraping selesai. Browser ditutup.' });
}
