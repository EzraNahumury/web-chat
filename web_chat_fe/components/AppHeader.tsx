"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getStoredUser } from "@/lib/auth";

const baseMenu = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat Admin" },
  { href: "/apply", label: "Daftar Member" },
  { href: "/status", label: "Status" }
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();

  const menu = [...baseMenu];
  if (user?.role === "ADMIN" || user?.role === "FOUNDER") {
    menu.push({ href: "/admin", label: "Admin Panel" });
  }
  if (user?.role === "FOUNDER") {
    menu.push({ href: "/founder", label: "Founder Panel" });
  }

  return (
    <header className="app-header">
      <div>
        <h1 className="brand">Komunitas Hub</h1>
        {user ? <p className="text-xs text-slate-600">Login as @{user.username} ({user.role})</p> : null}
      </div>
      <nav className="flex flex-wrap gap-2">
        {menu.map((item) => (
          <Link key={item.href} className={pathname === item.href ? "nav-chip active" : "nav-chip"} href={item.href}>
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          className="nav-chip danger"
          onClick={() => {
            clearAuth();
            router.replace("/login");
          }}
        >
          Logout
        </button>
      </nav>
    </header>
  );
}

