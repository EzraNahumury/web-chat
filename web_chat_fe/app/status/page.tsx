"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";

type ApplicationRow = {
  id: string;
  senderBankAccountName: string;
  bankName: string;
  transferDate: string;
  amount: number;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  paymentProof: {
    fileUrl: string;
    fileType: string;
  } | null;
};

type ApplicationsResponse = {
  applications: ApplicationRow[];
};

function statusClass(status: ApplicationRow["status"]) {
  if (status === "VERIFIED") return "status-pill active";
  if (status === "REJECTED") return "status-pill rejected";
  return "status-pill pending";
}

function StatusContent() {
  const token = getToken();
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    apiRequest<ApplicationsResponse>("/api/applications/me", { token })
      .then((res) => setRows(res.applications))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load status"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <AppHeader />
      <section className="panel">
        <h2 className="text-2xl font-bold">Status Pendaftaran</h2>
        <p className="hint mt-1">Riwayat pengajuan kamu ditampilkan di sini.</p>

        {loading ? <p className="mt-4 text-sm text-slate-500">Loading...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 space-y-3">
          {rows.map((item) => (
            <article key={item.id} className="panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {item.senderBankAccountName} - {item.bankName}
                </p>
                <span className={statusClass(item.status)}>{item.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Tanggal transfer: {new Date(item.transferDate).toLocaleDateString()} | Nominal: Rp
                {item.amount.toLocaleString("id-ID")}
              </p>
              {item.paymentProof ? (
                <p className="mt-1 text-sm">
                  Bukti transfer:{" "}
                  <a className="text-teal-700 underline" href={item.paymentProof.fileUrl} target="_blank">
                    Preview file
                  </a>
                </p>
              ) : null}
              {item.adminNote ? <p className="mt-2 text-sm text-slate-700">Catatan admin: {item.adminNote}</p> : null}
            </article>
          ))}
          {!loading && rows.length === 0 ? <p className="hint">Belum ada pengajuan.</p> : null}
        </div>
      </section>
    </>
  );
}

export default function StatusPage() {
  return (
    <AuthGuard>
      <div className="page-shell">
        <main className="container">
          <StatusContent />
        </main>
      </div>
    </AuthGuard>
  );
}

