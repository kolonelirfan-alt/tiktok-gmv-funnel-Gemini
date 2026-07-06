# Menggunakan base image resmi dari Playwright yang sudah berisi Chromium & dependencies
FROM mcr.microsoft.com/playwright:v1.48.2-jammy

# Set direktori kerja di dalam container
WORKDIR /app

# Copy file package.json dan package-lock.json (jika ada)
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (termasuk Prisma client karena ada postinstall)
RUN npm install

# Copy seluruh file project
COPY . .

# Expose port untuk Express.js (Railway akan override dengan env PORT)
EXPOSE 3000

# Set environment variable untuk Playwright (Headless di VPS)
ENV BROWSER_HEADED=false
ENV NODE_ENV=production

# Jalankan perintah start (migrate db & start server)
CMD ["npm", "start"]
