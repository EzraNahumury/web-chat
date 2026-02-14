import Link from "next/link";

export default function HomePage() {
  return (
    <div className="page-shell">
      <main className="container panel">
        <p className="text-sm font-semibold text-teal-700">MVP Local Preview</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight">Komunitas Membership + Chat Admin WA-Like</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Versi ini jalan full lokal untuk test alur signup/login, chat permanen ke admin, dan pendaftaran member
          dengan upload bukti transfer.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="panel">
            <h2 className="text-xl font-semibold">Untuk User</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>Signup dengan username unik</li>
              <li>Chat langsung ke admin (1 room permanen)</li>
              <li>Daftar member 200rb + upload bukti transfer</li>
              <li>Cek status pending/active/rejected</li>
            </ul>
          </div>
          <div className="panel">
            <h2 className="text-xl font-semibold">Untuk Admin / Founder</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>Daftar chat user mirip WA Web</li>
              <li>Balas chat secara realtime</li>
              <li>Verifikasi pendaftaran member</li>
              <li>Founder bisa kelola admin + audit log</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn" href="/signup">
            Mulai Signup
          </Link>
          <Link className="btn secondary" href="/login">
            Login
          </Link>
        </div>
      </main>
    </div>
  );
}

