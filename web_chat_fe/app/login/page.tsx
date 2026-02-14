"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import type { CurrentUser } from "@/lib/types";

type LoginResponse = {
  token: string;
  user: CurrentUser;
};

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get("next");
    setNextPath(param ?? "");
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password }
      });

      setAuth(response.token, response.user);
      router.replace(nextPath || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <main className="container panel max-w-xl">
        <h1 className="text-3xl font-bold">Login</h1>
        <p className="mt-2 text-sm text-slate-600">Masuk untuk lanjut ke dashboard.</p>

        <form className="mt-6" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="mt-4 flex gap-2">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </button>
            <Link className="btn secondary" href="/signup">
              Sign up
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
