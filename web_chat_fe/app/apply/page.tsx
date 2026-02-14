"use client";

import { FormEvent, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { apiRequest } from "@/lib/api";
import { getToken, getStoredUser } from "@/lib/auth";

type UploadResponse = {
  paymentProof: {
    fileUrl: string;
    fileType: string;
    fileSizeBytes: number;
  };
};

export default function ApplyPage() {
  return (
    <AuthGuard>
      <div className="page-shell">
        <main className="container">
          <ApplyContent />
        </main>
      </div>
    </AuthGuard>
  );
}

function ApplyContent() {
  const user = getStoredUser();
  const token = getToken();
  const [senderBankAccountName, setSenderBankAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [amount, setAmount] = useState(200000);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !file) {
      setError("Semua field termasuk file bukti transfer wajib diisi.");
      return;
    }
    if (user?.role !== "USER") {
      setError("Hanya role USER yang bisa submit pendaftaran member.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResult = await apiRequest<UploadResponse>("/api/uploads/payment-proof", {
        method: "POST",
        token,
        formData
      });

      await apiRequest<{ application: unknown }>("/api/applications", {
        method: "POST",
        token,
        body: {
          senderBankAccountName,
          bankName,
          transferDate,
          amount,
          paymentProof: uploadResult.paymentProof
        }
      });

      setSuccess("Pendaftaran berhasil dikirim. Status kamu sekarang pending.");
      setSenderBankAccountName("");
      setBankName("");
      setTransferDate("");
      setAmount(200000);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <section className="panel">
        <h2 className="text-2xl font-bold">Daftar Member (Rp200.000)</h2>
        <p className="hint mt-1">Upload file JPG/PNG/PDF, maksimal 5MB.</p>

        <form className="mt-5" onSubmit={onSubmit}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="senderName">Nama Rekening Pengirim</label>
              <input
                id="senderName"
                value={senderBankAccountName}
                onChange={(event) => setSenderBankAccountName(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="bankName">Bank</label>
              <input
                id="bankName"
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="transferDate">Tanggal Transfer</label>
              <input
                id="transferDate"
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="amount">Nominal</label>
              <input
                id="amount"
                type="number"
                min={200000}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="proof">Upload Bukti Transfer</label>
            <input
              id="proof"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

          <button className="btn mt-3" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Pendaftaran"}
          </button>
        </form>
      </section>
    </>
  );
}

