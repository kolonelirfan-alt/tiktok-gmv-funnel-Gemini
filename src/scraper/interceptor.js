/**
 * interceptor.js
 * Mencegat & mem-parse network response dari TikTok
 * untuk mengekstrak data produk dan status iklan (GMV Max).
 */

// Endpoint TikTok yang perlu kita intercept
const TARGET_ENDPOINTS = [
  '/api/search/item/',      // Hasil pencarian produk
  '/api/recommend/item_list/', // Feed FYP / rekomendasi
  '/api/shop/item_list',    // Daftar produk toko
];

/**
 * Cek apakah URL response adalah endpoint yang kita targetkan
 * @param {string} url
 * @returns {string | null} - nama endpoint atau null
 */
function matchEndpoint(url) {
  for (const endpoint of TARGET_ENDPOINTS) {
    if (url.includes(endpoint)) return endpoint;
  }
  return null;
}

/**
 * Parse data produk dari response JSON TikTok
 * @param {object} json - raw JSON dari response TikTok
 * @param {string} endpoint - endpoint yang ditemukan
 * @returns {Array<object>} - array produk yang sudah di-parse
 */
function parseProductData(json, endpoint) {
  const products = [];

  try {
    // Struktur data berbeda-beda per endpoint TikTok
    let items = [];

    if (endpoint.includes('search')) {
      items = json?.data?.products || json?.data?.items || [];
    } else if (endpoint.includes('recommend') || endpoint.includes('item_list')) {
      items = json?.data?.aweme_list || json?.itemList || json?.data?.items || [];
    }

    for (const item of items) {
      // Coba ekstrak data produk dari berbagai struktur respons TikTok
      const productInfo = item?.product || item?.shopping_ads_info || item;
      const adInfo = item?.ad_info || item?.sponsored_info || {};

      const parsed = {
        productId: productInfo?.product_id || productInfo?.id || item?.aweme_id || null,
        shopId: productInfo?.shop_id || null,
        name: productInfo?.title || productInfo?.name || null,
        price: productInfo?.price_info?.real_price || productInfo?.price || null,
        isPaidAd:
          adInfo?.is_paid_ad === true ||
          item?.is_top_ads === true ||
          item?.ad_type === 'gmv_max' ||
          item?.is_sponsored === true ||
          false,
        adType: adInfo?.ad_type || (item?.is_sponsored ? 'SPONSORED' : 'ORGANIC'),
      };

      if (parsed.productId) {
        products.push(parsed);
      }
    }
  } catch (err) {
    console.warn('[Interceptor] Gagal parse response:', err.message);
  }

  return products;
}

/**
 * Mulai mendengarkan network response pada page Playwright
 * @param {import('playwright').Page} page
 * @param {Function} onProductFound - callback({productId, shopId, name, price, isPaidAd, adType, endpoint})
 */
export function listenToNetwork(page, onProductFound) {
  page.on('response', async (response) => {
    const url = response.url();
    const matchedEndpoint = matchEndpoint(url);

    if (!matchedEndpoint) return;
    if (!response.ok()) return;

    // Pastikan content-type adalah JSON
    const contentType = response.headers()['content-type'] || '';
    if (!contentType.includes('application/json')) return;

    try {
      const json = await response.json();
      const products = parseProductData(json, matchedEndpoint);

      for (const product of products) {
        onProductFound({ ...product, endpoint: matchedEndpoint });
      }
    } catch {
      // Response body tidak bisa di-parse, abaikan
    }
  });
}

/**
 * Hentikan semua listener network pada page
 * @param {import('playwright').Page} page
 */
export function stopListening(page) {
  page.removeAllListeners('response');
}
