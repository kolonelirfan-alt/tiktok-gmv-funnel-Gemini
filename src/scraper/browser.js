import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Aktifkan stealth plugin untuk menghindari deteksi bot
chromium.use(StealthPlugin());

let browserInstance = null;
let pageInstance = null;

/**
 * Daftar User-Agent mobile untuk rotasi
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Linux; Android 13; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
];

/**
 * Ambil User-Agent secara acak
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Inisialisasi browser Playwright dengan stealth plugin
 * @param {boolean} headed - true = tampilkan browser (untuk debug)
 * @returns {Promise<{browser, page}>}
 */
export async function launchBrowser(headed = false) {
  if (browserInstance) {
    console.log('[Browser] Instance sudah ada, menggunakan yang lama.');
    return { browser: browserInstance, page: pageInstance };
  }

  const userAgent = getRandomUserAgent();

  browserInstance = await chromium.launch({
    headless: !headed,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browserInstance.newContext({
    userAgent,
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro viewport
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    // Randomize canvas fingerprint
    permissions: [],
  });

  // Inject script untuk menyembunyikan property WebDriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    window.chrome = { runtime: {} };
  });

  pageInstance = await context.newPage();

  console.log(`[Browser] Launched. UA: ${userAgent.slice(0, 60)}...`);
  return { browser: browserInstance, page: pageInstance };
}

/**
 * Tutup browser dan reset instance
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    pageInstance = null;
    console.log('[Browser] Ditutup dan instance direset.');
  }
}

/**
 * Cek apakah browser sedang aktif
 */
export function isBrowserActive() {
  return browserInstance !== null;
}
