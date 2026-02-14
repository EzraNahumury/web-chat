"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { apiRequest } from "@/lib/api";
import { getToken, getStoredUser, setAuth } from "@/lib/auth";
import type { CurrentUser } from "@/lib/types";

type MeResponse = { user: CurrentUser };

function membershipClass(status: CurrentUser["membershipStatus"]) {
  return `status-pill ${status.toLowerCase()}`;
}

function DashboardContent() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const localUser = getStoredUser();
    const token = getToken();
    if (!localUser || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    apiRequest<MeResponse>("/api/auth/me", { token })
      .then((response) => {
        setAuth(token, response.user);
        setUser(response.user);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  if (!user) return <p className="text-sm text-red-600">{error || "Session not found."}</p>;

  return (
    <>
      <AppHeader />
      <div className="panel">
        <h2 className="text-2xl font-bold">Halo @{user.username}</h2>
        <p className="mt-2 text-sm text-slate-600">Status membership kamu saat ini:</p>
        <div className="mt-3">
          <span className={membershipClass(user.membershipStatus)}>{user.membershipStatus}</span>
        </div>

        {user.membershipStatus === "ACTIVE" ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Pendaftaran Anda telah disetujui. Admin akan segera menambahkan Anda ke grup WA.
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Link className="panel" href="/chat">
            <h3 className="font-semibold">Chat Admin</h3>
            <p className="mt-1 text-sm text-slate-600">Tanya apapun langsung seperti WA.</p>
          </Link>
          <Link className="panel" href="/apply">
            <h3 className="font-semibold">Daftar Member 200rb</h3>
            <p className="mt-1 text-sm text-slate-600">Isi form + upload bukti transfer.</p>
          </Link>
          <Link className="panel" href="/status">
            <h3 className="font-semibold">Status Pendaftaran</h3>
            <p className="mt-1 text-sm text-slate-600">Pantau pending / verified / rejected.</p>
          </Link>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="page-shell">
        <main className="container">
          <DashboardContent />
        </main>
      </div>
    </AuthGuard>
  );
}
