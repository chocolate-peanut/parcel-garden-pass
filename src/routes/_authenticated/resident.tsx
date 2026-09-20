import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Clock, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppBar } from "@/components/AppBar";
import { ClayButton, ClayCard } from "@/components/clay";
import { QrImage } from "@/components/QrImage";
import { StatusPill } from "@/components/StatusPill";
import { useMe, homeForRole } from "@/hooks/useMe";
import {
  claimLink,
  formatWhen,
  hoursLeft,
  isExpired,
  PARCEL_SELECT,
  unitLabel,
  type NotificationRow,
  type ParcelWithRefs,
} from "@/lib/parbox";

export const Route = createFileRoute("/_authenticated/resident")({
  head: () => ({
    meta: [
      { title: "My parcels — ParBox" },
      { name: "description", content: "See your lobby parcels and share your pickup QR code." },
      { property: "og:title", content: "My parcels — ParBox" },
      {
        property: "og:description",
        content: "See your lobby parcels and share your pickup QR code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResidentPage,
});

function ResidentPage() {
  const { me, loading } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && me && me.role !== "resident") {
      void navigate({ to: homeForRole(me.role), replace: true });
    }
  }, [me, loading, navigate]);

  const parcels = useQuery({
    queryKey: ["my-parcels", me?.userId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select(PARCEL_SELECT)
        .order("intake_ts", { ascending: false });
      if (error) throw error;
      return data as unknown as ParcelWithRefs[];
    },
  });

  const notifications = useQuery({
    queryKey: ["my-notifications", me?.userId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as NotificationRow[];
    },
  });

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
  }

  async function share(parcel: ParcelWithRefs) {
    const url = claimLink(parcel.claim_token);
    const text = `Collect my parcel at the lobby desk with this code: ${url}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "ParBox pickup code", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Pickup link copied");
    } catch {
      /* dismissed */
    }
  }

  const open = (parcels.data ?? []).filter((p) => !["claimed", "returned"].includes(p.status));
  const history = (parcels.data ?? []).filter((p) => ["claimed", "returned"].includes(p.status));
  const unread = (notifications.data ?? []).filter((n) => !n.read);
  const expiringSoon = open.filter(
    (p) => !isExpired(p.qr_expiry_ts) && hoursLeft(p.qr_expiry_ts) < 24,
  );

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <AppBar
        title="My parcels"
        subtitle={
          me?.resident?.unit_id
            ? `Unit ${unitLabel(open[0]?.units ?? null)}`
            : me?.fullName || ""
        }
      />

      {!me?.resident ? (
        <ClayCard className="mb-5 bg-warning/20 text-sm">
          Your account isn't linked to a unit yet. Ask the building admin to add your email to your
          unit's resident list.
        </ClayCard>
      ) : null}

      {expiringSoon.length ? (
        <ClayCard className="mb-5 flex items-center gap-3 bg-warning/25 text-sm font-semibold">
          <Clock className="size-5 shrink-0" />
          <span>
            {expiringSoon.length} parcel{expiringSoon.length > 1 ? "s" : ""} must be collected within
            24 hours.
          </span>
        </ClayCard>
      ) : null}

      {unread.length ? (
        <section className="mb-6 space-y-3">
          {unread.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => void markRead(n.id)}
              className="clay flex w-full items-start gap-3 p-4 text-left"
            >
              <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <span className="block font-bold">{n.title}</span>
                <span className="block text-sm text-muted-foreground">{n.body}</span>
              </span>
            </button>
          ))}
        </section>
      ) : null}

      <section className="space-y-4">
        {parcels.isLoading ? (
          <ClayCard className="animate-pulse text-sm text-muted-foreground">Loading…</ClayCard>
        ) : open.length === 0 ? (
          <ClayCard className="text-center text-sm text-muted-foreground">
            No parcels waiting. We'll let you know when one arrives.
          </ClayCard>
        ) : (
          open.map((p) => (
            <ClayCard key={p.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold">{p.couriers?.company_name ?? "Parcel"}</p>
                  <p className="text-sm text-muted-foreground">
                    Arrived {formatWhen(p.intake_ts)}
                  </p>
                  {p.storage_locations ? (
                    <p className="text-sm text-muted-foreground">
                      Shelf {p.storage_locations.zone} {p.storage_locations.shelf_code}
                    </p>
                  ) : null}
                </div>
                <StatusPill status={p.status} />
              </div>

              {p.condition_flag ? (
                <p className="clay-inset bg-destructive/10 p-3 text-sm text-destructive">
                  Damage noted at intake{p.condition_note ? `: ${p.condition_note}` : ""}
                </p>
              ) : null}

              {!p.token_used && !isExpired(p.qr_expiry_ts) && p.status !== "disputed" ? (
                <div className="space-y-3 text-center">
                  <div className="flex justify-center">
                    <QrImage value={claimLink(p.claim_token)} size={180} />
                  </div>
                  <p className="font-mono text-sm tracking-widest">{p.claim_token}</p>
                  <p className="text-xs text-muted-foreground">
                    Valid until {formatWhen(p.qr_expiry_ts)} · single use
                  </p>
                  <ClayButton variant="soft" className="w-full" onClick={() => void share(p)}>
                    <Share2 className="size-4" /> Share with someone else
                  </ClayButton>
                </div>
              ) : isExpired(p.qr_expiry_ts) ? (
                <p className="clay-inset p-3 text-sm text-muted-foreground">
                  Pickup code expired. Ask the lobby desk to extend the hold.
                </p>
              ) : null}
            </ClayCard>
          ))
        )}
      </section>

      {history.length ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-extrabold">History</h2>
          {history.map((p) => (
            <div key={p.id} className="clay flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-bold">{p.couriers?.company_name ?? "Parcel"}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {p.claim_ts ? `Collected ${formatWhen(p.claim_ts)}` : formatWhen(p.intake_ts)}
                  {p.claimed_by_name ? ` by ${p.claimed_by_name}` : ""}
                  {p.is_proxy_claim ? " (proxy)" : ""}
                </p>
              </div>
              <StatusPill status={p.status} />
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
