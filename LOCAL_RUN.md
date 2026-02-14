# Local Run Guide

Panduan cepat menjalankan backend + frontend secara lokal untuk testing end-to-end.

## 1) Setup Backend (SQLite lokal)

Masuk ke folder backend:

```bash
cd C:\web\web_chat_backend
```

Edit `.env`:
- `DATABASE_URL="file:./dev.db"`
- pastikan `FOUNDER_EMAIL="ezranhmry@gmail.com"` dan `FOUNDER_PASSWORD="23082004"`

Lalu jalankan:

```bash
npm install
npm run prisma:migrate:dev -- --name init_local_sqlite
npm run prisma:seed
npm run dev
```

Backend aktif di: `http://localhost:4000`

## 2) Setup Frontend

Buka terminal baru:

```bash
cd C:\web\web_chat
copy .env.local.example .env.local
npm install
npm run dev
```

Frontend aktif di: `http://localhost:3000`

## 3) Akun Test

Founder (sudah diset via seed):
- Email: `ezranhmry@gmail.com`
- Password: `23082004`

User biasa:
- daftar dari halaman `/signup`

## 4) Flow Cek Manual

1. Signup user baru
2. Login user -> kirim chat di `/chat`
3. Login founder/admin -> buka `/admin`, balas chat
4. User submit form pendaftaran di `/apply` (dengan upload file)
5. Admin/founder verify/reject di `/admin`
6. User cek status di `/status` dan `/dashboard`
