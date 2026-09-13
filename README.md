# ParBox - Parcel Receiption

Build ParBox, a parcel registration web app for apartment lobby security guards, replacing a paper logbook system. Use a claymorphism visual style: soft rounded shapes, subtle shadows, a calm green/warm palette (summer-garden tones), simple and glanceable — this app is used quickly, under time pressure, at a lobby desk.

ROLES (use Supabase Auth with role-based access):

1. Guard — logs into a tablet-friendly interface, registers incoming parcels, verifies pickups.

2. Resident — logs into a mobile-friendly interface, sees their parcel status, gets notified, can share their claim QR with someone else.

3. Admin — manages residents/units, resolves disputes, monitors unclaimed parcels.

There is NO courier-facing login or app. Couriers only appear as a data field on the parcel record.

DATA MODEL (Supabase/Postgres tables):

- units: id, unit_number, floor, building

- residents: id, unit_id (FK), name, phone, email

- guards: id, name, shift

- couriers: id, company_name, tracking_number (just reference data, no login)

- storage_locations: id, zone, shelf_code, capacity

- parcels: id, unit_id (FK), courier_id (FK), storage_id (FK), guard_id_in (FK, guard who did intake), status (enum: registered, stored, notified, claimed, disputed, escalated, returned), condition_flag (boolean), photo_url, intake_ts, claim_token (unique, single-use), qr_expiry_ts (default: intake_ts + 72 hours), claimed_by_name, is_proxy_claim (boolean), claim_ts

- audit_log: id, parcel_id (FK), actor_type (guard/resident/admin/system), actor_id, action, timestamp

CORE FLOW (guard app):

1. Intake: guard scans/enters a parcel identifier, selects the resident's unit, photographs the parcel, flags any visible damage, assigns a storage location. This generates a unique claim_token and a QR code from it, and sets status to "stored."

2. Claim: guard scans the resident's claim QR (or enters the token manually as a fallback), which looks up the parcel. Guard enters the claimant's name and marks a Yes/No toggle for "Is this the resident, or someone claiming on their behalf (proxy)?" On confirm, status becomes "claimed," claim_ts is set, and the claim_token is invalidated so it can't be reused. If the QR is expired (past qr_expiry_ts) or already used, block the claim and show a clear error.

3. If condition_flag was set at intake, allow the guard to open a "dispute" record instead of closing normally.

CORE FLOW (resident app):

1. Resident sees a list of their parcels with current status (stored / notified / claimed / disputed).

2. When a parcel is in "stored" status, the resident sees their claim QR code on screen with an option to share it (e.g., copy link or share sheet) — this represents handing the QR to a proxy claimant.

3. Resident gets an in-app notification (and simulate email via Supabase) when a parcel is registered for them.

4. If a parcel is unclaimed close to its expiry window, show a visible reminder banner.

CORE FLOW (admin console):

1. Manage residents and units (CRUD).

2. Dashboard of parcels nearing or past their unclaimed timeout, with a manual action to mark "returned to sender" or "extend hold."

3. Dispute queue: view flagged parcels with photos and resolve as accepted/rejected.

4. Audit log viewer, filterable by parcel or resident.

TECHNICAL NOTES:

- Use a QR code generation library for creating the claim QR from claim_token, and a QR/barcode scanning library for the guard's intake and claim screens (camera-based scanning on tablet/mobile).

- Enforce Supabase row-level security: guards can see all parcels; residents can only see parcels tied to their own unit; admins have full access.

- Every state change (intake, claim, dispute, escalation, return) should insert a row into audit_log.

- Do not add payments, subscriptions, or Stripe — this app has no billing.

- Keep the UI fast and minimal — guards and residents should be able to complete their core action (register a parcel, claim a parcel) in just a few taps/clicks.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/37985067-dc85-45ea-9544-3829f5bdb962).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
