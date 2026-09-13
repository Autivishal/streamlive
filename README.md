# My Loop Stream 🎬

A personal live-streaming platform inspired by Loop Stream, designed for 24/7 continuous YouTube/RTMP streaming.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│                    RENDER HOSTED                        │
│                                                         │
│   Next.js 16 Web Dashboard + REST API                   │
│   Authentication (NextAuth.js v5)                       │
│   Prisma 7 + PostgreSQL Database                        │
│   Cloudinary Direct Upload (Signed URLs)                │
└──────────────────────────┬──────────────────────────────┘
                           │ Authenticated REST API (Polling + Events)
┌──────────────────────────┴──────────────────────────────┐
│                    LOCAL WINDOWS WORKER                 │
│                                                         │
│   Node.js Worker Service                                │
│   FFmpeg Process Manager (concat demuxer / copy / x264) │
│   State Machine (IDLE / STREAMING / RECOVERY)           │
└──────────────────────────┬──────────────────────────────┘
                           │ RTMP Stream Output
                           ▼
                 YouTube Live / RTMP
```

---

## 🚀 Getting Started

### 1. Web Dashboard (Local Dev)

1. **Environment Configuration**
   Copy `.env.example` to `.env` and fill in credentials:
   ```bash
   cp .env.example .env
   ```

2. **Database Setup**
   Push schema and seed admin user:
   ```bash
   npx prisma db push
   npm run seed
   ```

3. **Run Next.js App**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` and log in with your admin credentials.

---

### 2. Local Windows Worker

1. **Install FFmpeg**
   - Download FFmpeg for Windows from [ffmpeg.org](https://ffmpeg.org/download.html).
   - Extract to `C:\ffmpeg` so `ffmpeg.exe` is at `C:\ffmpeg\bin\ffmpeg.exe`.

2. **Worker Configuration**
   Copy `worker/.env.example` to `worker/.env`:
   ```env
   API_URL=http://localhost:3000
   WORKER_TOKEN=<token from Settings page in Dashboard>
   FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
   ```

3. **Run Worker**
   ```bash
   cd worker
   npm install
   npm run worker:dev
   ```

---

## ☁️ Deploying to Render

1. Push your code to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml` and provision:
   - PostgreSQL database (`streamlive-db`)
   - Web Service (`my-loop-stream`)
4. Set your environment variables in Render:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Deploy!
6. Update your local worker's `worker/.env` with `API_URL=https://your-app.onrender.com`.

---

## 🔒 Security

- **Stream Keys:** AES-256 encrypted before database storage.
- **Worker Auth:** Protected with single-use session tokens and secret header verification.
- **Uploads:** Direct browser-to-Cloudinary uploads with HMAC SHA-256 signed parameters.
