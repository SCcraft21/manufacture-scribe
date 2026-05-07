import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, getRoles, highestRole, type SessionInfo } from "@/lib/nova";

export function TopNav() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (uid: string | undefined) => {
      if (!uid) return active && setSession(null);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return active && setSession(null);
      const [profile, roles] = await Promise.all([getProfile(uid), getRoles(uid)]);
      if (active) setSession({ user: u.user, profile, roles, role: highestRole(roles) });
    };

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      load(s?.user.id);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
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
          {session && (
            <>
              <Link to="/chat" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition" activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-secondary" }}>Chat</Link>
              <Link to="/dashboard" className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition" activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-secondary" }}>Dashboard</Link>
              <span className="ml-3 hidden text-xs text-muted-foreground md:inline">
                {session.user.email} · {session.role}
              </span>
              <button onClick={logout} className="ml-2 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary transition">Logout</button>
            </>
          )}
          {!session && (
            <>
              <Link to="/login" className="rounded-md px-3 py-2 hover:bg-secondary transition">Login</Link>
              <Link to="/register" className="rounded-md bg-primary px-3 py-2 text-primary-foreground hover:opacity-90 transition">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
