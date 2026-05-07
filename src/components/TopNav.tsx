import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAuth, setAuth, type AuthState } from "@/lib/nova-api";

export function TopNav() {
  const router = useRouter();
  const [auth, setLocal] = useState<AuthState | null>(null);

  useEffect(() => {
    setLocal(getAuth());
  }, []);

  const logout = () => {
    setAuth(null);
    setLocal(null);
    router.navigate({ to: "/login" });
  };

  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow)]" />
          <span className="text-lg font-bold tracking-wide">
            NOVA <span className="text-primary">NEXUS</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {auth && (
            <>
              <Link
                to="/chat"
                className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-secondary" }}
              >
                Chat
              </Link>
              <Link
                to="/dashboard"
                className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-secondary" }}
              >
                Dashboard
              </Link>
              <Link
                to="/settings"
                className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-secondary" }}
              >
                Settings
              </Link>
              <span className="ml-3 hidden text-xs text-muted-foreground md:inline">
                {auth.user.email} · {auth.user.role}
              </span>
              <button
                onClick={logout}
                className="ml-2 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary transition"
              >
                Logout
              </button>
            </>
          )}
          {!auth && (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 hover:bg-secondary transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90 transition"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
