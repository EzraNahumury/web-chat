# web_chat (Frontend Lokal)

Frontend Next.js untuk MVP komunitas:
- signup/login
- user dashboard
- chat admin WA-like (realtime)
- pendaftaran member + upload bukti transfer
- admin panel + founder panel

## Setup Lokal

1. Install dependency:
```bash
npm install
```

2. Buat env:
```bash
cp .env.local.example .env.local
```

3. Jalankan frontend:
```bash
npm run dev
```

Default frontend akan akses backend di `http://localhost:4000`.

## Halaman Utama

- `/` landing
- `/signup`
- `/login`
- `/dashboard`
- `/chat`
- `/apply`
- `/status`
- `/admin` (admin/founder)
- `/founder` (founder only)

## Catatan Local Test

- Backend harus running dulu.
- Realtime chat pakai Socket.IO.
- Upload bukti transfer dikirim ke endpoint backend `/api/uploads/payment-proof`.

