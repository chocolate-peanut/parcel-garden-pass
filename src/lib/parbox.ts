import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ParcelStatus = Database["public"]["Enums"]["parcel_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type ActorType = Database["public"]["Enums"]["actor_type"];

export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Resident = Database["public"]["Tables"]["residents"]["Row"];
export type Courier = Database["public"]["Tables"]["couriers"]["Row"];
export type StorageLocation = Database["public"]["Tables"]["storage_locations"]["Row"];
export type Parcel = Database["public"]["Tables"]["parcels"]["Row"];
export type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export type ParcelWithRefs = Parcel & {
  units: Pick<Unit, "id" | "unit_number" | "building" | "floor"> | null;
  couriers: Pick<Courier, "id" | "company_name" | "tracking_number"> | null;
  storage_locations: Pick<StorageLocation, "id" | "zone" | "shelf_code"> | null;
};

export const PARCEL_SELECT =
  "*, units(id, unit_number, building, floor), couriers(id, company_name, tracking_number), storage_locations(id, zone, shelf_code)";

export async function logAudit(input: {
  parcelId: string;
  actorType: ActorType;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  details?: string;
}) {
  await supabase.from("audit_log").insert({
    parcel_id: input.parcelId,
    actor_type: input.actorType,
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    action: input.action,
    details: input.details ?? null,
  });
}

export function hoursLeft(expiry: string): number {
  return (new Date(expiry).getTime() - Date.now()) / 36e5;
}

export function isExpired(expiry: string): boolean {
  return hoursLeft(expiry) <= 0;
}

export function formatWhen(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function unitLabel(
  u: Pick<Unit, "building" | "floor" | "unit_number"> | null | undefined,
): string {
  if (!u) return "—";
  return [u.building, u.floor, u.unit_number].filter((p) => p != null && p !== "").join("-");
}

export function claimLink(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/c/${token}`;
}

export const OPEN_STATUSES: ParcelStatus[] = ["registered", "stored", "notified"];
