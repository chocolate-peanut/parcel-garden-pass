import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Boxes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClayButton, ClayCard, ClayInput, Field } from "@/components/clay";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — ParBox" },
      { name: "description", content: "Set a new password for your ParBox account." },
      { property: "og:title", content: "Reset Password — ParBox" },
      { property: "og:description", content: "Set a new password for your ParBox account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    if (params.get("error")) {
      setLinkError(
        params.get("error_description") ||
          "This password reset link is invalid or has expired.",
      );
      setChecking(false);
      return;
    }

    let alive = true;
    let attempts = 0;

    const check = () => {
      if (!alive) return;
      attempts += 1;
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!alive) return;
        if (session) {
          setReady(true);
          setChecking(false);
          return;
        }
        // The auth client may still be processing the recovery hash on first load.
        if (hash.includes("type=recovery") && attempts < 12) {
          window.setTimeout(check, 400);
          return;
        }
        setLinkError(
          "This password reset link is invalid or has expired. Request a new one from the sign-in page.",
        );
        setChecking(false);
      });
    };

    check();
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Sign in with your new password.");
      await supabase.auth.signOut();
      void navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <div
          aria-hidden="true"
          className="clay mx-auto mb-5 flex size-16 items-center justify-center bg-secondary/60 text-primary"
        >
          <Boxes className="size-8" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-muted-foreground">Choose a new password for your ParBox account</p>
      </div>

      <ClayCard className="space-y-5 p-6">
        {checking ? (
          <p className="text-center text-sm text-muted-foreground">Checking your reset link…</p>
        ) : linkError ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-destructive">{linkError}</p>
            <ClayButton
              type="button"
              className="w-full"
              onClick={() => void navigate({ to: "/auth" })}
            >
              Back to sign in
            </ClayButton>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="New password">
              <ClayInput
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </Field>
            <Field label="Confirm new password">
              <ClayInput
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </Field>
            <ClayButton type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : "Set New Password"}
            </ClayButton>
          </form>
        )}
      </ClayCard>
    </main>
  );
}
