import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "user" | "ops" | "admin";

export type Profile = {
  id: string;
  name: string;
  email: string;
};

export type OrderRow = {
  id: string;
  order_number: number;
  part_name: string;
  material: string | null;
  quantity: number;
  dimensions: string | null;
  deadline: string | null;
  notes: string | null;
  status: "Received" | "In Review" | "Accepted" | "Rejected" | "Completed";
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export const STATUSES: OrderRow["status"][] = [
  "Received",
  "In Review",
  "Accepted",
  "Rejected",
  "Completed",
];

export async function getRoles(userId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((r) => r.role as Role);
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id,name,email")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export function highestRole(roles: Role[]): Role {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("ops")) return "ops";
  return "user";
}

export type SessionInfo = {
  user: User;
  profile: Profile | null;
  roles: Role[];
  role: Role;
};
