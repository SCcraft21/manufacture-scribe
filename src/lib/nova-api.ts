const STORAGE_KEY = "nova_nexus_auth";
const API_KEY = "nova_nexus_api_url";

export type User = { id: string; name: string; email: string; role: "user" | "ops" | "admin" };
export type AuthState = { token: string; user: User };

export const getApiUrl = () =>
  (typeof window !== "undefined" && localStorage.getItem(API_KEY)) || "http://localhost:5000";

export const setApiUrl = (url: string) => localStorage.setItem(API_KEY, url.replace(/\/+$/, ""));

export const getAuth = (): AuthState | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthState) : null;
};

export const setAuth = (a: AuthState | null) => {
  if (a) localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  else localStorage.removeItem(STORAGE_KEY);
};

export async function api<T = any>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.auth !== false) {
    const a = getAuth();
    if (a) headers.set("Authorization", `Bearer ${a.token}`);
  }
  const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}
