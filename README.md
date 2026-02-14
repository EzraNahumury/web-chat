# Komunitas Membership Web

Dokumentasi ini menjelaskan rencana implementasi web komunitas berbayar (`Rp200.000`) dengan fitur:

- Login dan registrasi user
- Pendaftaran member berbayar dengan upload bukti transfer
- Tanya jawab user ke admin (model inbox/ticket)
- Panel admin untuk verifikasi pembayaran dan membalas pertanyaan

## 1. Tujuan Produk

Membangun platform web yang menggantikan komunikasi manual via WA/TikTok agar:

- Proses pendaftaran member lebih rapi
- Verifikasi pembayaran lebih terstruktur
- Pertanyaan user bisa ditangani dalam satu sistem
- Risiko akun kena ban karena spam chat massal berkurang

## 2. Scope MVP

Fokus versi awal (MVP):

1. Auth: Sign Up, Login, Logout
2. Home user dengan menu:
   - Daftar Member
   - Tanya Admin
3. Form daftar member:
   - Isi data
   - Upload bukti transfer
   - Status: `pending`, `approved`, `rejected`
4. Fitur tanya admin:
   - User kirim pertanyaan
   - Admin membalas
   - Riwayat percakapan tersimpan per user
5. Admin panel:
   - Kelola pendaftaran
   - Verifikasi bukti transfer
   - Balas pertanyaan user

Di luar MVP (fase lanjut):

- Integrasi payment gateway (Midtrans/Xendit) untuk verifikasi otomatis
- Notifikasi WhatsApp/email otomatis
- Dashboard analitik dan laporan keuangan

## 3. Peran Pengguna

### User

- Membuat akun dan login
- Mengajukan pendaftaran member
- Upload bukti transfer
- Melihat status pendaftaran
- Mengirim pertanyaan ke admin

### Admin

- Login ke panel admin
- Melihat semua pengajuan member
- Approve/reject pendaftaran
- Membalas pertanyaan user
- Melihat riwayat aktivitas

## 4. Alur Utama Sistem

### 4.1 Alur Pendaftaran Member

1. User login
2. User buka halaman `Daftar Member`
3. User isi form + upload bukti transfer
4. Sistem menyimpan data dengan status `pending`
5. Admin meninjau data
6. Admin set status:
   - `approved`: user resmi jadi member
   - `rejected`: user diminta perbaiki data / upload ulang

### 4.2 Alur Tanya Admin

1. User login
2. User buka menu `Tanya Admin`
3. User membuat pertanyaan baru
4. Admin melihat pertanyaan masuk
5. Admin membalas
6. User melihat balasan pada thread yang sama

## 5. Struktur Halaman

### User-side

- `/` Home
- `/signup` Registrasi
- `/login` Login
- `/member/register` Form pendaftaran member
- `/member/status` Status pendaftaran
- `/support` Tanya admin (list thread)
- `/support/:threadId` Detail percakapan

### Admin-side

- `/admin/login`
- `/admin/dashboard`
- `/admin/applications` List pengajuan member
- `/admin/applications/:id` Detail + aksi approve/reject
- `/admin/support` List pertanyaan user
- `/admin/support/:threadId` Balas pertanyaan

## 6. Rancangan Database (Sederhana)

### `users`

- `id` (uuid, pk)
- `name` (string)
- `email` (string, unique)
- `password_hash` (string)
- `role` (enum: `user`, `admin`)
- `created_at` (datetime)
- `updated_at` (datetime)

### `member_applications`

- `id` (uuid, pk)
- `user_id` (fk -> users.id)
- `full_name` (string)
- `phone` (string)
- `notes` (text, nullable)
- `payment_amount` (integer) -> default `200000`
- `payment_proof_url` (string)
- `status` (enum: `pending`, `approved`, `rejected`)
- `reviewed_by` (fk -> users.id, nullable)
- `reviewed_at` (datetime, nullable)
- `created_at` (datetime)
- `updated_at` (datetime)

### `support_threads`

- `id` (uuid, pk)
- `user_id` (fk -> users.id)
- `subject` (string)
- `status` (enum: `open`, `closed`)
- `created_at` (datetime)
- `updated_at` (datetime)

### `support_messages`

- `id` (uuid, pk)
- `thread_id` (fk -> support_threads.id)
- `sender_id` (fk -> users.id)
- `message` (text)
- `created_at` (datetime)

## 7. API Draft (REST)

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Member Registration

- `POST /api/member-applications`
- `GET /api/member-applications/me`
- `GET /api/admin/member-applications`
- `GET /api/admin/member-applications/:id`
- `PATCH /api/admin/member-applications/:id/status`

### Support

- `POST /api/support/threads`
- `GET /api/support/threads`
- `GET /api/support/threads/:id/messages`
- `POST /api/support/threads/:id/messages`

### Admin Support

- `GET /api/admin/support/threads`
- `GET /api/admin/support/threads/:id/messages`
- `POST /api/admin/support/threads/:id/messages`
- `PATCH /api/admin/support/threads/:id/close`

## 8. Validasi & Aturan Bisnis

- Hanya user login yang bisa membuat pengajuan member
- Satu user hanya boleh punya satu pengajuan aktif `pending`
- Nominal member default `Rp200.000`
- File bukti transfer wajib:
  - format: `jpg`, `jpeg`, `png`, `pdf`
  - ukuran maksimum: `2MB` (bisa disesuaikan)
- Hanya admin yang bisa mengubah status pengajuan
- Hanya pemilik thread dan admin yang bisa membaca pesan thread

## 9. Keamanan Minimum

- Password di-hash (`bcrypt/argon2`)
- Session aman (HTTP-only cookie atau JWT dengan expiry)
- CSRF protection (jika cookie-based session)
- Rate limit endpoint sensitif:
  - login
  - kirim pertanyaan
  - submit form pendaftaran
- CAPTCHA pada signup untuk cegah bot
- Sanitasi input untuk cegah XSS/SQL Injection
- Audit log untuk aksi admin (approve/reject)

## 10. Rekomendasi Teknologi

Contoh stack cepat dan stabil:

- Frontend: Next.js
- Backend API: Next.js Route Handler / Express
- Database: PostgreSQL
- ORM: Prisma
- Storage bukti transfer: Cloudinary / S3-compatible storage
- Auth: NextAuth / custom JWT session
- Deploy: Vercel (frontend/API) + Supabase/Neon (database)

Alternatif hemat:

- Laravel + MySQL + shared hosting/VPS

## 11. Checklist Implementasi

### Fase 1 (MVP)

- [ ] Setup project + auth
- [ ] Buat tabel database inti
- [ ] Form pendaftaran member + upload bukti transfer
- [ ] Admin panel verifikasi pendaftaran
- [ ] Fitur tanya admin (thread + message)
- [ ] Basic security (rate limit, validation, role guard)

### Fase 2

- [ ] Payment gateway otomatis
- [ ] Notifikasi email/WA
- [ ] Laporan dashboard admin
- [ ] Moderasi konten lebih lanjut

## 12. Kriteria Sukses MVP

- User bisa daftar akun dan login tanpa error
- User bisa submit pengajuan member dengan bukti transfer
- Admin bisa approve/reject pengajuan
- User bisa membuat pertanyaan dan menerima balasan admin
- Semua alur penting tercatat di database

## 13. Catatan Operasional

- Gunakan 1 akun admin utama + 1 akun cadangan
- Lakukan backup database harian
- Simpan bukti transfer di storage terpisah dari server aplikasi
- Review log spam setiap minggu untuk update aturan rate limit

---

Dokumentasi ini bisa dijadikan acuan langsung untuk:

1. Desain UI/UX
2. Implementasi backend/frontend
3. Penulisan task board (Trello/Jira/Notion)
4. Pengujian QA/UAT
