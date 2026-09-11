import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Resident } from "@/lib/parbox";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export type Me = {
  userId: string;
  role: AppRole;
  fullName: string;
  guardId: string | null;
  resident: Resident | null;
};

export function useMe() {
  const { session, loading } = useSession();
  const userId = session?.user.id ?? null;

  const query = useQuery<Me | null>({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const [{ data: roles }, { data: profile }, { data: guard }, { data: resident }] =
        await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", userId),
          supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
          supabase.from("guards").select("id").eq("user_id", userId).maybeSingle(),
          supabase.from("residents").select("*").eq("user_id", userId).maybeSingle(),
        ]);

      const roleList = (roles ?? []).map((r) => r.role);
      const role: AppRole = roleList.includes("admin")
        ? "admin"
        : roleList.includes("guard")
          ? "guard"
          : "resident";

      return {
        userId,
        role,
        fullName: profile?.full_name || session?.user.email || "",
        guardId: guard?.id ?? null,
        resident: resident ?? null,
      };
    },
  });

  return { me: query.data ?? null, loading: loading || query.isLoading, session };
}

export function homeForRole(role: AppRole): string {
  return role === "admin" ? "/admin" : role === "guard" ? "/guard" : "/resident";
}
