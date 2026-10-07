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
    <header className="mb-7 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-5 sm:flex">
      <div className="flex min-w-0 items-center gap-3 sm:flex-1">
      <div className="clay flex size-12 shrink-0 items-center justify-center bg-secondary/60 text-primary">
        <Boxes className="size-6" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold leading-tight">{title}</h1>
        {subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      </div>
      <ClayButton variant="soft" size="sm" className="min-w-11 shrink-0" onClick={() => void signOut()} aria-label="Sign out" title="Sign out">
        <LogOut className="size-4" />
      </ClayButton>
    </header>
  );
}
