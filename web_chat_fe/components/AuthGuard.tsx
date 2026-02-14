"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth";
import type { AppRole, CurrentUser } from "@/lib/types";

type AuthGuardProps = {
  children: React.ReactNode;
  allowRoles?: AppRole[];
};

export function AuthGuard({ children, allowRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowRoles && !allowRoles.includes(stored.role)) {
      router.replace("/dashboard");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(stored);
    setReady(true);
  }, [allowRoles, pathname, router]);

  if (!ready || !user) {
    return <div className="page-shell"><p className="text-slate-500">Checking session...</p></div>;
  }

  return <>{children}</>;
}
