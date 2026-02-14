"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import type { CurrentUser } from "@/lib/types";

type SignupResponse = {
  token: string;
  user: CurrentUser;
};

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest<SignupResponse>("/api/auth/signup", {
        method: "POST",
        body: { username, email, password }
      });

      setAuth(response.token, response.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to signup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <main className="container panel max-w-xl">
        <h1 className="text-3xl font-bold">Sign up</h1>
        <p className="mt-2 text-sm text-slate-600">
          Username akan dipakai sebagai nama chat kamu saat ngobrol dengan admin.
        </p>

        <form className="mt-6" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="contoh: ezranhmry"
              required
            />
          </div>
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
              minLength={8}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="mt-4 flex gap-2">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Loading..." : "Create account"}
            </button>
            <Link className="btn secondary" href="/login">
              Login
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

