import { useNavigate } from "@tanstack/react-router";
import { Boxes, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClayButton } from "@/components/clay";

export function AppBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="mb-6 flex items-center gap-3">
      <div className="clay flex size-12 shrink-0 items-center justify-center bg-primary text-primary-foreground">
        <Boxes className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-extrabold leading-tight">{title}</h1>
        {subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <ClayButton variant="soft" size="sm" onClick={() => void signOut()} aria-label="Sign out">
        <LogOut className="size-4" />
      </ClayButton>
    </header>
  );
}
