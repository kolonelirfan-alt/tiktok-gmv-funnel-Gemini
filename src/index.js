/**
 * index.js
 * Entry point utama — Express server dengan semua API endpoint
 * dan Server-Sent Events (SSE) untuk streaming log ke dashboard.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import prisma from '../config/database.js';
import { runJourney, stopSession, isSessionActive } from './core/journey.js';

const app = express();
const PORT = process.env.PORT || 3000;

// __dirname equivalent untuk ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── MIDDLEWARE ─────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Sajikan file HTML dashboard sebagai static file
app.use(express.static(path.join(__dirname, '..')));

// ─── SSE CLIENT MANAGEMENT ──────────────────────────────────────────
// Simpan semua koneksi SSE aktif
const sseClients = new Set();

/**
 * Kirim event ke semua client SSE yang terhubung
 * @param {object} data - objek data yang akan dikirim
 */
function broadcastToSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

// ─── ROUTE: Status ──────────────────────────────────────────────────
/**
 * GET /api/status
 * Cek status scraper saat ini
 */
app.get('/api/status', (req, res) => {
  res.json({
    running: isSessionActive(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── ROUTE: SSE Log Stream ───────────────────────────────────────────
/**
 * GET /api/scrape/logs
 * Buka koneksi Server-Sent Events untuk menerima log real-time
 */
app.get('/api/scrape/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Kirim pesan sambutan
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE terhubung ke backend.' })}\n\n`);

  sseClients.add(res);
  console.log(`[SSE] Client terhubung. Total client: ${sseClients.size}`);

  // Hapus client jika koneksi ditutup
  req.on('close', () => {
    sseClients.delete(res);
    console.log(`[SSE] Client terputus. Total client: ${sseClients.size}`);
  });
});

// ─── ROUTE: Start Scraping ───────────────────────────────────────────
/**
 * POST /api/scrape/start
 * Mulai sesi scraping
 * Body: { niche: "Jeans" }
 */
app.post('/api/scrape/start', async (req, res) => {
  const { niche } = req.body;

  if (!niche) {
    return res.status(400).json({ error: 'Parameter "niche" wajib diisi.' });
  }

  if (isSessionActive()) {
    return res.status(409).json({ error: 'Session scraping sudah berjalan. Hentikan dulu.' });
  }

  // Langsung kirim 200 OK, scraping berjalan di background
  res.json({ success: true, message: `Session scraping dimulai untuk niche: ${niche}` });

  // Jalankan journey di background (non-blocking)
  runJourney(niche, broadcastToSSE).catch((err) => {
    broadcastToSSE({ type: 'error', message: `Fatal error: ${err.message}` });
    console.error('[Journey] Fatal error:', err);
  });
});

// ─── ROUTE: Stop Scraping ────────────────────────────────────────────
/**
 * POST /api/scrape/stop
 * Hentikan sesi scraping yang sedang berjalan
 */
app.post('/api/scrape/stop', async (req, res) => {
  if (!isSessionActive()) {
    return res.status(400).json({ error: 'Tidak ada session yang sedang berjalan.' });
  }

  await stopSession();
  broadcastToSSE({ type: 'stopped', message: '[SYSTEM] Proses monitoring dihentikan paksa oleh pengguna.' });

  res.json({ success: true, message: 'Session scraping dihentikan.' });
});

// ─── ROUTE: Reports ──────────────────────────────────────────────────
/**
 * GET /api/reports
 * Ambil semua data dari tabel ad_exposures (join dengan products)
 * Query params: ?limit=50&niche=Jeans
 */
app.get('/api/reports', async (req, res) => {
  const { limit = 50, niche } = req.query;

  const whereClause = niche ? { product: { niche } } : {};

  const exposures = await prisma.adExposure.findMany({
    where: whereClause,
    take: parseInt(limit),
    orderBy: { createdAt: 'desc' },
    include: {
      product: true,
      creator: true,
    },
  });

  // Transform data agar cocok dengan kolom tabel di dashboard HTML
  const tableData = exposures.map((exp) => ({
    id: exp.id,
    productId: exp.product.productId,
    niche: exp.product.niche,
    keyword: exp.keyword || '-',
    fypDetected: exp.fypDetected,
    affiliateCount: exp.affiliateCount,
    status: exp.status,
    createdAt: exp.createdAt,
  }));

  res.json({ success: true, data: tableData, total: tableData.length });
});

// ─── ROUTE: Dashboard ────────────────────────────────────────────────
/**
 * GET /
 * Sajikan file dashboard HTML
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'gemini-code-1783344922723.html'));
});

// ─── START SERVER ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 TikTok GMV Max Funnel Tracker berjalan di http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`📡 API Status: http://localhost:${PORT}/api/status`);
  console.log(`📋 Reports  : http://localhost:${PORT}/api/reports\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Mematikan server...');
  await prisma.$disconnect();
  process.exit(0);
});
