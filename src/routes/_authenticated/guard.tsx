import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Camera, PackagePlus, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppBar } from "@/components/AppBar";
import { ClayButton, ClayCard, ClayInput, ClaySelect, Field } from "@/components/clay";
import { QrImage } from "@/components/QrImage";
import { QrScanner } from "@/components/QrScanner";
import { StatusPill } from "@/components/StatusPill";
import { useMe, homeForRole } from "@/hooks/useMe";
import {
  claimLink,
  formatWhen,
  isExpired,
  logAudit,
  PARCEL_SELECT,
  unitLabel,
  type ParcelWithRefs,
  type StorageLocation,
  type Unit,
} from "@/lib/parbox";

export const Route = createFileRoute("/_authenticated/guard")({
  head: () => ({
    meta: [
      { title: "Guard Desk — ParBox" },
      { name: "description", content: "Register incoming parcels and verify resident pickups." },
      { property: "og:title", content: "Guard Desk — ParBox" },
      {
        property: "og:description",
        content: "Register incoming parcels and verify resident pickups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuardPage,
});

function tokenFromInput(raw: string): string {
  const text = raw.trim();
  const match = text.match(/\/c\/([A-Za-z0-9]+)/);
  return (match?.[1] ?? text).trim();
}

function GuardPage() {
  const { me, loading } = useMe();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"intake" | "claim">("intake");

  useEffect(() => {
    if (!loading && me && me.role === "resident") {
      void navigate({ to: homeForRole(me.role), replace: true });
    }
  }, [me, loading, navigate]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppBar title="Guard Desk" subtitle={me?.fullName || "Lobby"} />

      <div className="clay-inset mb-6 grid grid-cols-2 gap-1 p-1">
        {(
          [
            ["intake", "Register Parcel", PackagePlus],
            ["claim", "Verify Pickup", ScanLine],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${tab === key ? "clay-soft bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "intake" ? <IntakeForm guardId={me?.guardId ?? null} guardName={me?.fullName ?? ""} /> : (
        <ClaimPanel guardName={me?.fullName ?? ""} guardId={me?.userId ?? null} />
      )}

      <RecentParcels />
    </main>
  );
}

function IntakeForm({ guardId, guardName }: { guardId: string | null; guardName: string }) {
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [unitId, setUnitId] = useState("");
  const [storageId, setStorageId] = useState("");
  const [company, setCompany] = useState("");
  const [tracking, setTracking] = useState("");
  const [damaged, setDamaged] = useState(false);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [created, setCreated] = useState<ParcelWithRefs | null>(null);

  const units = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .order("building")
        .order("unit_number");
      if (error) throw error;
      return data as Unit[];
    },
  });

  const storages = useQuery({
    queryKey: ["storage_locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_locations")
        .select("*")
        .order("zone")
        .order("shelf_code");
      if (error) throw error;
      return data as StorageLocation[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!unitId) throw new Error("Pick the resident's unit");

      let courierId: string | null = null;
      if (company.trim()) {
        const { data, error } = await supabase
          .from("couriers")
          .insert({ company_name: company.trim(), tracking_number: tracking.trim() || null })
          .select("id")
          .single();
        if (error) throw error;
        courierId = data.id;
      }

      const { data: parcel, error } = await supabase
        .from("parcels")
        .insert({
          unit_id: unitId,
          courier_id: courierId,
          storage_id: storageId || null,
          guard_id_in: guardId,
          parcel_identifier: identifier.trim() || null,
          status: "stored",
          condition_flag: damaged,
          condition_note: damaged ? note.trim() || null : null,
        })
        .select(PARCEL_SELECT)
        .single();
      if (error) throw error;
      const row = parcel as unknown as ParcelWithRefs;

      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `${row.id}/intake.${ext}`;
        const up = await supabase.storage.from("parcel-photos").upload(path, photo, { upsert: true });
        if (!up.error) {
          await supabase.from("parcels").update({ photo_url: path }).eq("id", row.id);
          row.photo_url = path;
        }
      }

      await logAudit({
        parcelId: row.id,
        actorType: "guard",
        actorName: guardName,
        action: "intake",
        details: `Stored${damaged ? " with damage flag" : ""}`,
      });

      await supabase.from("notifications").insert({
        unit_id: unitId,
        parcel_id: row.id,
        title: "Parcel waiting for you",
        body: `A parcel${company ? ` from ${company}` : ""} is stored at the lobby desk. Show your QR to collect it.`,
      });

      return row;
    },
    onSuccess: (row) => {
      setCreated(row);
      setIdentifier("");
      setCompany("");
      setTracking("");
      setDamaged(false);
      setNote("");
      setPhoto(null);
      toast.success("Parcel registered");
      void queryClient.invalidateQueries({ queryKey: ["guard-parcels"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not register parcel"),
  });

  if (created) {
    return (
      <ClayCard className="space-y-5 text-center">
        <h2 className="text-xl font-extrabold">Parcel stored</h2>
        <p className="text-sm text-muted-foreground">
          Unit {unitLabel(created.units)} · {formatWhen(created.intake_ts)}
        </p>
        <div className="flex justify-center">
          <QrImage value={claimLink(created.claim_token)} />
        </div>
        <p className="font-mono text-sm tracking-widest">{created.claim_token}</p>
        <p className="text-sm text-muted-foreground">
          The resident has been notified and can show this code to collect.
        </p>
        <ClayButton className="w-full" onClick={() => setCreated(null)}>
          Register another
        </ClayButton>
      </ClayCard>
    );
  }

  return (
    <ClayCard className="space-y-4">
      <Field label="Parcel Identifier">
        <ClayInput
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Scan or type the label code"
        />
      </Field>
      <QrScanner label="Scan parcel label" onResult={(text) => setIdentifier(text)} />

      <Field label="Resident Unit">
        <ClaySelect value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">Select unit…</option>
          {(units.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {unitLabel(u)}
            </option>
          ))}
        </ClaySelect>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Courier Company">
          <ClayInput value={company} onChange={(e) => setCompany(e.target.value)} placeholder="J&T" />
        </Field>
        <Field label="Tracking Number">
          <ClayInput
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Optional"
          />
        </Field>
      </div>

      <Field label="Storage Location">
        <ClaySelect value={storageId} onChange={(e) => setStorageId(e.target.value)}>
          <option value="">Select shelf…</option>
          {(storages.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.zone} · {s.shelf_code}
            </option>
          ))}
        </ClaySelect>
      </Field>

      <Field label="Parcel Photo">
        <label className="clay-inset flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
          <Camera className="size-5" />
          <span className="truncate">{photo ? photo.name : "Take or choose a photo"}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
      </Field>

      <button
        type="button"
        onClick={() => setDamaged((v) => !v)}
        className={`clay-soft flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold ${damaged ? "bg-destructive/15 text-destructive" : "bg-secondary text-secondary-foreground"
          }`}
      >
        <AlertTriangle className="size-5" />
        {damaged ? "Damage flagged" : "Flag visible damage"}
      </button>

      {damaged ? (
        <Field label="Damage Note">
          <ClayInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Box crushed on one side"
          />
        </Field>
      ) : null}

      <ClayButton
        className="w-full"
        size="lg"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? "Saving…" : "Register Parcel"}
      </ClayButton>
    </ClayCard>
  );
}

function ClaimPanel({ guardName, guardId }: { guardName: string; guardId: string | null }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [parcel, setParcel] = useState<ParcelWithRefs | null>(null);
  const [claimant, setClaimant] = useState("");
  const [proxy, setProxy] = useState(false);
  const [disputeNote, setDisputeNote] = useState("");

  const blocked = useMemo(() => {
    if (!parcel) return null;
    if (parcel.token_used || parcel.status === "claimed") return "This code has already been used.";
    if (isExpired(parcel.qr_expiry_ts)) return "This code has expired. Ask the admin to extend the hold.";
    if (parcel.status === "returned") return "This parcel was returned to sender.";
    return null;
  }, [parcel]);

  const lookup = useMutation({
    mutationFn: async (raw: string) => {
      const token = tokenFromInput(raw);
      if (!token) throw new Error("Enter a claim code");
      const { data, error } = await supabase
        .from("parcels")
        .select(PARCEL_SELECT)
        .eq("claim_token", token)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No parcel found for that code");
      return data as unknown as ParcelWithRefs;
    },
    onSuccess: (row) => setParcel(row),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Lookup failed"),
  });

  const confirm = useMutation({
    mutationFn: async () => {
      if (!parcel) return;
      if (!claimant.trim()) throw new Error("Enter the claimant's name");
      const { error } = await supabase
        .from("parcels")
        .update({
          status: "claimed",
          claim_ts: new Date().toISOString(),
          token_used: true,
          claimed_by_name: claimant.trim(),
          is_proxy_claim: proxy,
        })
        .eq("id", parcel.id)
        .eq("token_used", false);
      if (error) throw error;
      await logAudit({
        parcelId: parcel.id,
        actorType: "guard",
        actorId: guardId,
        actorName: guardName,
        action: "claim",
        details: `${claimant.trim()}${proxy ? " (proxy)" : " (resident)"}`,
      });
    },
    onSuccess: () => {
      toast.success("Pickup confirmed");
      setParcel(null);
      setInput("");
      setClaimant("");
      setProxy(false);
      void queryClient.invalidateQueries({ queryKey: ["guard-parcels"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not confirm pickup"),
  });

  const dispute = useMutation({
    mutationFn: async () => {
      if (!parcel) return;
      const { error } = await supabase
        .from("parcels")
        .update({
          status: "disputed",
          dispute_status: "open",
          dispute_note: disputeNote.trim() || parcel.condition_note,
        })
        .eq("id", parcel.id);
      if (error) throw error;
      await logAudit({
        parcelId: parcel.id,
        actorType: "guard",
        actorId: guardId,
        actorName: guardName,
        action: "dispute_opened",
        details: disputeNote.trim() || "Damage dispute raised at pickup",
      });
    },
    onSuccess: () => {
      toast.success("Dispute opened for admin review");
      setParcel(null);
      setInput("");
      setDisputeNote("");
      void queryClient.invalidateQueries({ queryKey: ["guard-parcels"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not open dispute"),
  });

  return (
    <ClayCard className="space-y-4">
      {!parcel ? (
        <>
          <Field label="Claim Code">
            <ClayInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scan the resident QR or type the code"
            />
          </Field>
          <QrScanner
            label="Scan Resident QR"
            onResult={(text) => {
              setInput(text);
              lookup.mutate(text);
            }}
          />
          <ClayButton className="w-full" onClick={() => lookup.mutate(input)} disabled={lookup.isPending}>
            {lookup.isPending ? "Looking up…" : "Look Up Parcel"}
          </ClayButton>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-extrabold">
                Unit {unitLabel(parcel.units)}
              </p>
              <p className="text-sm text-muted-foreground">
                {parcel.couriers?.company_name ?? "Courier n/a"} ·{" "}
                {parcel.storage_locations
                  ? `${parcel.storage_locations.zone} ${parcel.storage_locations.shelf_code}`
                  : "No shelf"}
              </p>
            </div>
            <StatusPill status={parcel.status} />
          </div>

          {blocked ? (
            <div className="clay-inset bg-destructive/10 p-4 text-sm font-semibold text-destructive">
              {blocked}
            </div>
          ) : (
            <>
              <Field label="Claimant Name">
                <ClayInput
                  value={claimant}
                  onChange={(e) => setClaimant(e.target.value)}
                  placeholder="Name of Person Collecting"
                />
              </Field>
              <div className="clay-inset grid grid-cols-2 gap-1 p-1">
                {[
                  { v: false, label: "Resident" },
                  { v: true, label: "Proxy" },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setProxy(o.v)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${proxy === o.v ? "clay-soft bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <ClayButton
                className="w-full"
                size="lg"
                disabled={confirm.isPending}
                onClick={() => confirm.mutate()}
              >
                {confirm.isPending ? "Confirming…" : "Confirm Pickup"}
              </ClayButton>
            </>
          )}

          {parcel.condition_flag && parcel.status !== "disputed" ? (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="flex items-center gap-2 text-sm font-bold text-destructive">
                <AlertTriangle className="size-4" /> Damage was flagged at intake
              </p>
              <ClayInput
                value={disputeNote}
                onChange={(e) => setDisputeNote(e.target.value)}
                placeholder="What did the resident say?"
              />
              <ClayButton
                variant="danger"
                className="w-full"
                disabled={dispute.isPending}
                onClick={() => dispute.mutate()}
              >
                Open dispute instead
              </ClayButton>
            </div>
          ) : null}

          <ClayButton
            variant="ghost"
            className="w-full"
            onClick={() => {
              setParcel(null);
              setInput("");
            }}
          >
            Cancel
          </ClayButton>
        </div>
      )}
    </ClayCard>
  );
}

function RecentParcels() {
  const { data } = useQuery({
    queryKey: ["guard-parcels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select(PARCEL_SELECT)
        .order("intake_ts", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as unknown as ParcelWithRefs[];
    },
  });

  if (!data?.length) return null;

  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-lg font-extrabold">Recent activity</h2>
      {data.map((p) => (
        <div key={p.id} className="clay flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-bold">
              Unit {unitLabel(p.units)}
              {p.parcel_identifier ? ` · ${p.parcel_identifier}` : ""}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {p.couriers?.company_name ?? "Courier n/a"} · {formatWhen(p.intake_ts)}
            </p>
          </div>
          <StatusPill status={p.status} />
        </div>
      ))}
    </section>
  );
}
