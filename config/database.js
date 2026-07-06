import { PrismaClient } from '@prisma/client';

// Singleton pattern — hindari terlalu banyak koneksi terbuka
const prisma = new PrismaClient({
  log: ['warn', 'error'], // tampilkan warning & error di console
});

export default prisma;
