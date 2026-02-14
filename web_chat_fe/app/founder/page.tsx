"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";

type AdminRow = {
  id: string;
  username: string;
  email: string;
  role: "FOUNDER" | "ADMIN";
  isActive: boolean;
};

type AuditRow = {
  id: string;
  action: string;
  createdAt: string;
  actor: { username: string; role: string };
  targetUser: { username: string; role: string } | null;
};

function FounderContent() {
  const token = getToken();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    if (!token) return;
    const [adminResult, logResult] = await Promise.all([
      apiRequest<{ admins: AdminRow[] }>("/api/founder/admins", { token }),
      apiRequest<{ logs: AuditRow[] }>("/api/founder/audit-logs", { token })
    ]);
    setAdmins(adminResult.admins);
    setLogs(logResult.logs);
  }

  useEffect(() => {
    loadData().catch((err) => setError(err instanceof Error ? err.message : "Failed to load founder panel"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function promoteAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !email) return;
    try {
      await apiRequest("/api/founder/admins", { method: "POST", token, body: { email } });
      setEmail("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote");
    }
  }

  async function setAdminActive(userId: string, isActive: boolean) {
    if (!token) return;
    try {
      await apiRequest(`/api/founder/admins/${userId}/active`, {
        method: "PATCH",
        token,
        body: { isActive }
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update admin status");
    }
  }

  return (
    <>
      <AppHeader />
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <section className="panel">
        <h2 className="text-2xl font-bold">Founder Panel</h2>
        <p className="hint mt-1">Tambah admin baru dan aktif/nonaktifkan admin.</p>

        <form className="mt-4 flex flex-wrap gap-2" onSubmit={promoteAdmin}>
          <input
            className="min-w-72 rounded-lg border border-slate-300 px-3 py-2"
            type="email"
            placeholder="Email user yang mau dijadikan admin"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button className="btn" type="submit">
            Promote to Admin
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {admins.map((admin) => (
            <div key={admin.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div>
                <p className="text-sm font-semibold">
                  @{admin.username} ({admin.role})
                </p>
                <p className="text-xs text-slate-600">{admin.email}</p>
              </div>
              {admin.role === "ADMIN" ? (
                <button
                  className={admin.isActive ? "btn danger" : "btn"}
                  type="button"
                  onClick={() => setAdminActive(admin.id, !admin.isActive)}
                >
                  {admin.isActive ? "Disable" : "Enable"}
                </button>
              ) : (
                <span className="status-pill active">Founder</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="panel mt-4">
        <h3 className="text-xl font-bold">Audit Log</h3>
        <div className="mt-3 space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <p className="font-semibold">{log.action}</p>
              <p className="text-slate-600">
                Actor: @{log.actor.username} ({log.actor.role})
                {log.targetUser ? ` -> Target: @${log.targetUser.username} (${log.targetUser.role})` : ""}
              </p>
              <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function FounderPage() {
  return (
    <AuthGuard allowRoles={["FOUNDER"]}>
      <div className="page-shell">
        <main className="container">
          <FounderContent />
        </main>
      </div>
    </AuthGuard>
  );
}

