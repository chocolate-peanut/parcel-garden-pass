import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Boxes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClayButton, ClayCard, ClayInput, ClaySelect, Field } from "@/components/clay";
import { useMe, homeForRole } from "@/hooks/useMe";
import type { AppRole } from "@/lib/parbox";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — ParBox" },
      { name: "description", content: "Sign In to ParBox to register or claim lobby parcels." },
      { property: "og:title", content: "Sign In — ParBox" },
      { property: "og:description", content: "Sign In to ParBox to register or claim lobby parcels." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { me, loading } = useMe();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("resident");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && me) void navigate({ to: homeForRole(me.role), replace: true });
  }, [me, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setPending(true);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <Link to="/" className="clay mx-auto mb-4 flex size-16 items-center justify-center bg-primary text-primary-foreground">
          <Boxes className="size-8" />
        </Link>
        <h1 className="text-3xl font-extrabold">ParBox</h1>
        <p className="text-muted-foreground">Lobby Parcel Register</p>
      </div>

      <ClayCard className="space-y-5 p-6">
        <div className="clay-inset grid grid-cols-2 gap-1 p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${mode === m ? "clay-soft bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
            >
              {m === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {pending ? (
          <p className="text-center text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>. Open it, then Sign In.
          </p>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" ? (
            <>
              <Field label="Full name">
                <ClayInput
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aisyah Rahman"
                  required
                />
              </Field>
              <Field label="I am a">
                <ClaySelect value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
                  <option value="resident">Resident</option>
                  <option value="guard">Security guard</option>
                  <option value="admin">Building admin</option>
                </ClaySelect>
              </Field>
            </>
          ) : null}
          <Field label="Email">
            <ClayInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field label="Password">
            <ClayInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </Field>
          <ClayButton type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </ClayButton>
        </form>

        {mode === "signup" ? (
          <p className="text-xs text-muted-foreground">
            Residents: use the email your building admin registered for your unit, so your parcels
            link automatically.
          </p>
        ) : null}
      </ClayCard>
    </main>
  );
}
