import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Clock, Home, ScrollText, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppBar } from "@/components/AppBar";
import { ClayButton, ClayCard, ClayInput, ClaySelect, Field } from "@/components/clay";
import { StatusPill } from "@/components/StatusPill";
import { useMe, homeForRole } from "@/hooks/useMe";
import {
  formatWhen,
  hoursLeft,
  logAudit,
  OPEN_STATUSES,
  PARCEL_SELECT,
  unitLabel,
  type AuditRow,
  type ParcelWithRefs,
  type Resident,
  type Unit,
} from "@/lib/parbox";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — ParBox" },
      {
        name: "description",
        content: "Manage units and residents, resolve parcel disputes and review the audit trail.",
      },
      { property: "og:title", content: "Admin console — ParBox" },
      {
        property: "og:description",
        content: "Manage units and residents, resolve parcel disputes and review the audit trail.",
      },
    ],
  }),
  component: AdminPage,
});

type Tab = "unclaimed" | "disputes" | "people" | "audit";

const TABS: { id: Tab; label: string; icon: typeof Clock }[] = [
  { id: "unclaimed", label: "Unclaimed", icon: Clock },
  { id: "disputes", label: "Disputes", icon: AlertTriangle },
  { id: "people", label: "Units & residents", icon: Users },
  { id: "audit", label: "Audit log", icon: ScrollText },
];

function AdminPage() {
  const { me, loading } = useMe();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("unclaimed");

  useEffect(() => {
    if (!loading && me && me.role !== "admin") {
      void navigate({ to: homeForRole(me.role), replace: true });
    }
  }, [me, loading, navigate]);

  if (loading || !me) {
    return <main className="p-6 text-muted-foreground">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <AppBar title="Admin console" subtitle={me.fullName} />

      <div className="clay-inset mb-6 grid grid-cols-2 gap-1 p-1 sm:grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
              tab === id ? "clay-soft bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-4" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {tab === "unclaimed" ? <UnclaimedTab actorName={me.fullName} /> : null}
      {tab === "disputes" ? <DisputesTab actorName={me.fullName} /> : null}
      {tab === "people" ? <PeopleTab /> : null}
      {tab === "audit" ? <AuditTab /> : null}
    </main>
  );
}

/* ---------------- Unclaimed ---------------- */

function UnclaimedTab({ actorName }: { actorName: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const parcels = useQuery({
    queryKey: ["admin-unclaimed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select(PARCEL_SELECT)
        .in("status", OPEN_STATUSES)
        .order("qr_expiry_ts", { ascending: true });
      if (error) throw error;
      return data as unknown as ParcelWithRefs[];
    },
  });

  const rows = (parcels.data ?? []).filter((p) => hoursLeft(p.qr_expiry_ts) < 24);

  async function extendHold(p: ParcelWithRefs) {
    setBusy(p.id);
    try {
      const next = new Date(Date.now() + 72 * 36e5).toISOString();
      const { error } = await supabase
        .from("parcels")
        .update({ qr_expiry_ts: next, token_used: false })
        .eq("id", p.id);
      if (error) throw error;
      await logAudit({
        parcelId: p.id,
        actorType: "admin",
        actorName,
        action: "hold_extended",
        details: "Hold extended by 72 hours",
      });
      toast.success("Hold extended by 72 hours");
      await queryClient.invalidateQueries({ queryKey: ["admin-unclaimed"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not extend hold");
    } finally {
      setBusy(null);
    }
  }

  async function markReturned(p: ParcelWithRefs) {
    setBusy(p.id);
    try {
      const { error } = await supabase
        .from("parcels")
        .update({ status: "returned", token_used: true })
        .eq("id", p.id);
      if (error) throw error;
      await logAudit({
        parcelId: p.id,
        actorType: "admin",
        actorName,
        action: "returned_to_sender",
        details: "Parcel returned to sender after the hold period",
      });
      toast.success("Marked as returned to sender");
      await queryClient.invalidateQueries({ queryKey: ["admin-unclaimed"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update parcel");
    } finally {
      setBusy(null);
    }
  }

  if (parcels.isLoading) return <p className="text-muted-foreground">Loading parcels…</p>;
  if (!rows.length)
    return (
      <ClayCard className="text-center text-muted-foreground">
        No parcels are near or past their hold deadline.
      </ClayCard>
    );

  return (
    <div className="space-y-3">
      {rows.map((p) => {
        const left = hoursLeft(p.qr_expiry_ts);
        return (
          <ClayCard key={p.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold">{unitLabel(p.units)}</span>
              <StatusPill status={p.status} />
              <span
                className={`ml-auto text-sm font-bold ${left <= 0 ? "text-destructive" : "text-warning-foreground"}`}
              >
                {left <= 0 ? "Overdue" : `${Math.round(left)}h left`}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {p.couriers?.company_name ?? "Unknown courier"}
              {p.parcel_identifier ? ` · ${p.parcel_identifier}` : ""} · in since{" "}
              {formatWhen(p.intake_ts)}
            </p>
            <div className="flex flex-wrap gap-2">
              <ClayButton
                size="sm"
                variant="soft"
                disabled={busy === p.id}
                onClick={() => void extendHold(p)}
              >
                Extend hold 72h
              </ClayButton>
              <ClayButton
                size="sm"
                variant="danger"
                disabled={busy === p.id}
                onClick={() => void markReturned(p)}
              >
                Returned to sender
              </ClayButton>
            </div>
          </ClayCard>
        );
      })}
    </div>
  );
}

/* ---------------- Disputes ---------------- */

function ParcelPhoto({ path }: { path: string }) {
  const signed = useQuery({
    queryKey: ["photo", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("parcel-photos")
        .createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!signed.data) return null;
  return (
    <img
      src={signed.data}
      alt="Parcel condition at intake"
      className="clay-inset max-h-56 w-full object-contain p-2"
    />
  );
}

function DisputesTab({ actorName }: { actorName: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const disputes = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select(PARCEL_SELECT)
        .eq("dispute_status", "open")
        .order("intake_ts", { ascending: false });
      if (error) throw error;
      return data as unknown as ParcelWithRefs[];
    },
  });

  async function resolve(p: ParcelWithRefs, outcome: "accepted" | "rejected") {
    setBusy(p.id);
    try {
      const { error } = await supabase
        .from("parcels")
        .update({
          dispute_status: outcome,
          status: outcome === "accepted" ? "escalated" : p.status,
        })
        .eq("id", p.id);
      if (error) throw error;
      await logAudit({
        parcelId: p.id,
        actorType: "admin",
        actorName,
        action: `dispute_${outcome}`,
        details: p.dispute_note ?? "",
      });
      toast.success(outcome === "accepted" ? "Dispute accepted" : "Dispute rejected");
      await queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resolve dispute");
    } finally {
      setBusy(null);
    }
  }

  if (disputes.isLoading) return <p className="text-muted-foreground">Loading disputes…</p>;
  if (!disputes.data?.length)
    return <ClayCard className="text-center text-muted-foreground">No open disputes.</ClayCard>;

  return (
    <div className="space-y-3">
      {disputes.data.map((p) => (
        <ClayCard key={p.id} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold">{unitLabel(p.units)}</span>
            <StatusPill status={p.status} />
            <span className="ml-auto text-sm text-muted-foreground">
              {formatWhen(p.intake_ts)}
            </span>
          </div>
          {p.condition_note ? (
            <p className="text-sm">
              <span className="font-semibold">Damage noted: </span>
              {p.condition_note}
            </p>
          ) : null}
          {p.dispute_note ? (
            <p className="text-sm">
              <span className="font-semibold">Dispute: </span>
              {p.dispute_note}
            </p>
          ) : null}
          {p.photo_url ? <ParcelPhoto path={p.photo_url} /> : null}
          <div className="flex flex-wrap gap-2">
            <ClayButton size="sm" disabled={busy === p.id} onClick={() => void resolve(p, "accepted")}>
              Accept dispute
            </ClayButton>
            <ClayButton
              size="sm"
              variant="soft"
              disabled={busy === p.id}
              onClick={() => void resolve(p, "rejected")}
            >
              Reject
            </ClayButton>
          </div>
        </ClayCard>
      ))}
    </div>
  );
}

/* ---------------- Units & residents ---------------- */

function PeopleTab() {
  const queryClient = useQueryClient();
  const [unitNumber, setUnitNumber] = useState("");
  const [floor, setFloor] = useState("1");
  const [building, setBuilding] = useState("A");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [unitId, setUnitId] = useState("");
  const [busy, setBusy] = useState(false);

  const units = useQuery({
    queryKey: ["admin-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .order("building")
        .order("floor")
        .order("unit_number");
      if (error) throw error;
      return data as Unit[];
    },
  });

  const residents = useQuery({
    queryKey: ["admin-residents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("*, units(id, unit_number, building, floor)")
        .order("name");
      if (error) throw error;
      return data as (Resident & { units: Unit | null })[];
    },
  });

  async function addUnit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.from("units").insert({
        unit_number: unitNumber.trim(),
        floor: Number(floor) || 1,
        building: building.trim() || "A",
      });
      if (error) throw error;
      setUnitNumber("");
      toast.success("Unit added");
      await queryClient.invalidateQueries({ queryKey: ["admin-units"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add unit");
    } finally {
      setBusy(false);
    }
  }

  async function addResident(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.from("residents").insert({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        unit_id: unitId || null,
      });
      if (error) throw error;
      setName("");
      setEmail("");
      setPhone("");
      toast.success("Resident added");
      await queryClient.invalidateQueries({ queryKey: ["admin-residents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add resident");
    } finally {
      setBusy(false);
    }
  }

  async function removeResident(id: string) {
    const { error } = await supabase.from("residents").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resident removed");
    await queryClient.invalidateQueries({ queryKey: ["admin-residents"] });
  }

  async function removeUnit(id: string) {
    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Unit removed");
    await queryClient.invalidateQueries({ queryKey: ["admin-units"] });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ClayCard className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Home className="size-5 text-primary" /> Units
        </h2>
        <form onSubmit={addUnit} className="grid grid-cols-3 gap-2">
          <Field label="Building">
            <ClayInput value={building} onChange={(e) => setBuilding(e.target.value)} required />
          </Field>
          <Field label="Floor">
            <ClayInput
              type="number"
              min={0}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              required
            />
          </Field>
          <Field label="Unit">
            <ClayInput
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="03"
              required
            />
          </Field>
          <ClayButton type="submit" size="sm" className="col-span-3" disabled={busy}>
            Add unit
          </ClayButton>
        </form>
        <ul className="max-h-72 space-y-2 overflow-auto">
          {(units.data ?? []).map((u) => (
            <li key={u.id} className="clay-inset flex items-center gap-2 px-3 py-2">
              <span className="font-semibold">{unitLabel(u)}</span>
              <ClayButton
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => void removeUnit(u.id)}
              >
                Remove
              </ClayButton>
            </li>
          ))}
        </ul>
      </ClayCard>

      <ClayCard className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Users className="size-5 text-primary" /> Residents
        </h2>
        <form onSubmit={addResident} className="space-y-2">
          <Field label="Full name">
            <ClayInput value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email (used to link their account)">
            <ClayInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Phone">
            <ClayInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Unit">
            <ClaySelect value={unitId} onChange={(e) => setUnitId(e.target.value)} required>
              <option value="">Select a unit</option>
              {(units.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {unitLabel(u)}
                </option>
              ))}
            </ClaySelect>
          </Field>
          <ClayButton type="submit" size="sm" className="w-full" disabled={busy}>
            Add resident
          </ClayButton>
        </form>
        <ul className="max-h-72 space-y-2 overflow-auto">
          {(residents.data ?? []).map((r) => (
            <li key={r.id} className="clay-inset flex items-center gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {unitLabel(r.units)} · {r.email ?? "no email"}
                </p>
              </div>
              <ClayButton
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => void removeResident(r.id)}
              >
                Remove
              </ClayButton>
            </li>
          ))}
        </ul>
      </ClayCard>
    </div>
  );
}

/* ---------------- Audit ---------------- */

function AuditTab() {
  const [filter, setFilter] = useState("");

  const log = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*, parcels(id, parcel_identifier, units(id, unit_number, building, floor))")
        .order("timestamp", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as unknown as (AuditRow & {
        parcels: {
          id: string;
          parcel_identifier: string | null;
          units: Unit | null;
        } | null;
      })[];
    },
  });

  const q = filter.trim().toLowerCase();
  const rows = (log.data ?? []).filter((r) => {
    if (!q) return true;
    const hay = [
      r.action,
      r.details,
      r.actor_name,
      r.parcels?.parcel_identifier,
      unitLabel(r.parcels?.units),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="space-y-3">
      <ClayInput
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by unit, parcel, person or action…"
      />
      {log.isLoading ? <p className="text-muted-foreground">Loading audit trail…</p> : null}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="clay-inset flex flex-wrap items-center gap-2 px-4 py-3">
            <span className="font-bold">{r.action.replace(/_/g, " ")}</span>
            <span className="text-sm text-muted-foreground">
              {unitLabel(r.parcels?.units)}
              {r.parcels?.parcel_identifier ? ` · ${r.parcels.parcel_identifier}` : ""}
            </span>
            {r.details ? <span className="text-sm">{r.details}</span> : null}
            <span className="ml-auto text-xs text-muted-foreground">
              {r.actor_name ?? r.actor_type} · {formatWhen(r.timestamp)}
            </span>
          </li>
        ))}
      </ul>
      {!log.isLoading && !rows.length ? (
        <ClayCard className="text-center text-muted-foreground">No matching entries.</ClayCard>
      ) : null}
    </div>
  );
}
