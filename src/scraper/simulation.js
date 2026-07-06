/**
 * simulation.js
 * Logika simulasi perilaku manusia (Human Behavior Simulation)
 * untuk menghindari deteksi anti-bot TikTok.
 */

/**
 * Delay acak antara min-max milliseconds (meniru jeda manusia)
 * @param {number} min - delay minimum (ms)
 * @param {number} max - delay maksimum (ms)
 */
export async function randomDelay(min = 1000, max = 4000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kalkulasi titik-titik Bezier Curve untuk simulasi gerakan mouse manusia
 * @param {object} start - koordinat awal {x, y}
 * @param {object} end - koordinat tujuan {x, y}
 * @param {number} steps - jumlah langkah gerakan
 * @returns {Array<{x, y}>} - array titik pergerakan
 */
function generateBezierPoints(start, end, steps = 30) {
  const points = [];
  // Titik kontrol acak untuk membentuk kurva
  const cp1 = {
    x: start.x + (Math.random() - 0.5) * 200,
    y: start.y + (Math.random() - 0.5) * 200,
  };
  const cp2 = {
    x: end.x + (Math.random() - 0.5) * 200,
    y: end.y + (Math.random() - 0.5) * 200,
  };

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x =
      Math.pow(1 - t, 3) * start.x +
      3 * Math.pow(1 - t, 2) * t * cp1.x +
      3 * (1 - t) * Math.pow(t, 2) * cp2.x +
      Math.pow(t, 3) * end.x;
    const y =
      Math.pow(1 - t, 3) * start.y +
      3 * Math.pow(1 - t, 2) * t * cp1.y +
      3 * (1 - t) * Math.pow(t, 2) * cp2.y +
      Math.pow(t, 3) * end.y;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  return points;
}

/**
 * Gerakkan mouse ke elemen target menggunakan Bezier Curve
 * @param {import('playwright').Page} page
 * @param {import('playwright').ElementHandle | string} target - element atau selector
 */
export async function humanMouseMove(page, target) {
  let endPos;
  if (typeof target === 'string') {
    const el = await page.$(target);
    if (!el) return;
    const box = await el.boundingBox();
    if (!box) return;
    endPos = {
      x: box.x + box.width / 2 + (Math.random() - 0.5) * 10,
      y: box.y + box.height / 2 + (Math.random() - 0.5) * 10,
    };
  } else {
    const box = await target.boundingBox();
    if (!box) return;
    endPos = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  const startPos = { x: Math.random() * 390, y: Math.random() * 400 };
  const points = generateBezierPoints(startPos, endPos);

  for (const point of points) {
    await page.mouse.move(point.x, point.y);
    await new Promise((r) => setTimeout(r, Math.random() * 8 + 2)); // 2-10ms per titik
  }
}

/**
 * Ketik teks satu karakter per waktu dengan delay acak (meniru cara mengetik manusia)
 * @param {import('playwright').Page} page
 * @param {string} selector - CSS selector input field
 * @param {string} text - teks yang akan diketik
 */
export async function humanType(page, selector, text) {
  await humanMouseMove(page, selector);
  await page.click(selector);
  await randomDelay(300, 700);

  for (const char of text) {
    await page.keyboard.type(char);
    // Delay per karakter: 110ms - 290ms (sesuai desain di dashboard)
    const charDelay = Math.floor(Math.random() * (290 - 110 + 1)) + 110;
    await new Promise((r) => setTimeout(r, charDelay));
  }

  await randomDelay(300, 800);
}

/**
 * Simulasi scroll manusia — scroll adaptif dengan jeda dinamis
 * @param {import('playwright').Page} page
 * @param {number} scrollCount - berapa kali scroll
 * @param {Function} onScroll - callback setiap selesai scroll (opsional)
 */
export async function humanScroll(page, scrollCount = 5, onScroll = null) {
  for (let i = 0; i < scrollCount; i++) {
    // Jarak scroll acak: 400-900px (meniru jempol manusia)
    const scrollDistance = Math.floor(Math.random() * 500) + 400;
    await page.evaluate((dist) => {
      window.scrollBy({ top: dist, behavior: 'smooth' });
    }, scrollDistance);

    if (onScroll) await onScroll(i + 1);

    // Jeda antar scroll: 1.5-4 detik
    await randomDelay(1500, 4000);
  }
}
