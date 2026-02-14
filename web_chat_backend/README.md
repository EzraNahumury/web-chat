# web_chat_backend

Backend API untuk MVP komunitas dengan alur:
- signup/login
- chat admin WA-like (1 user = 1 room chat permanen)
- pendaftaran member 200rb + upload bukti transfer (manual verifikasi)
- role founder/admin/user

## Stack

- Node.js + Express + TypeScript
- Prisma + SQLite (lokal, tanpa install database server)
- JWT auth
- Socket.IO untuk realtime chat

## Struktur Data Inti

- `users`: username unik, email unik, role, membership_status, is_active
- `chats`: 1 user = 1 room
- `messages`: bubble chat, read state
- `applications`: data transfer
- `payment_proofs`: metadata bukti transfer
- `audit_logs`: aksi founder/admin

## Setup Local

1. Install dependency
```bash
npm install
```

2. Buat env file
```bash
cp .env.example .env
```

3. Generate prisma client
```bash
npm run prisma:generate
```

4. Jalankan migrasi
```bash
npm run prisma:migrate:dev -- --name init_local_sqlite
```

5. Seed founder/admin (opsional)
```bash
npm run prisma:seed
```

6. Run dev server
```bash
npm run dev
```

## Env Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN` (contoh: `http://localhost:3000`)
- `PUBLIC_API_BASE_URL` (contoh: `http://localhost:4000`, dipakai untuk URL hasil upload)
- `PORT`
- Seed opsional:
  - `FOUNDER_EMAIL`, `FOUNDER_PASSWORD`, `FOUNDER_USERNAME`
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`

## API Ringkas

### Auth

- `POST /api/auth/signup`
  - body: `username`, `email`, `password`
- `POST /api/auth/login`
- `GET /api/auth/me`

### User Chat (WA-like)

- `GET /api/chat/my-room`
- `POST /api/chat/my-room/messages`
  - body: `body`

### User Applications

- `POST /api/uploads/payment-proof` (multipart form-data, field: `file`)
- `POST /api/applications`
  - body:
    - `senderBankAccountName`
    - `bankName`
    - `transferDate`
    - `amount` (minimal 200000)
    - `paymentProof.fileUrl`
    - `paymentProof.fileType` (`image/jpeg`, `image/png`, `application/pdf`)
    - `paymentProof.fileSizeBytes` (maks 5MB)
- `GET /api/applications/me`

### Admin Panel

- `GET /api/admin/chats`
- `GET /api/admin/chats/:chatId/messages`
- `POST /api/admin/chats/:chatId/messages`
- `GET /api/admin/applications`
- `GET /api/admin/applications/:id`
- `PATCH /api/admin/applications/:id/status`
  - body: `status` (`VERIFIED`/`REJECTED`), `adminNote` (opsional)
- `GET /api/admin/members?status=ACTIVE`

### Founder Panel

- `GET /api/founder/admins`
- `POST /api/founder/admins` (promote user jadi admin)
- `PATCH /api/founder/admins/:id/active` (aktif/nonaktif admin)
- `GET /api/founder/audit-logs`

## Realtime (Socket.IO)

Koneksi socket pakai JWT token:

```ts
io("http://localhost:4000", {
  auth: { token: "BearerJWT" }
});
```

Event:
- server emit `chat:message`
- server emit `chat:updated` (untuk list admin)
- server emit `chat:read`
- client (admin/founder) emit `chat:join` dengan `chatId`

## Railway Deploy

1. Buat service PostgreSQL di Railway
2. Deploy folder `web_chat_backend` sebagai service baru
3. Set env vars di Railway
4. Build command:
```bash
npm run build
```
5. Start command:
```bash
npm run prisma:migrate:deploy && npm run start
```

Catatan: untuk Railway production, ubah kembali datasource Prisma ke PostgreSQL atau gunakan schema khusus production.
