import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PackageCheck, QrCode, ShieldCheck, Boxes } from "lucide-react";
import { ClayCard } from "@/components/clay";
import { useMe, homeForRole } from "@/hooks/useMe";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ParBox — Parcel register for apartment lobbies" },
      {
        name: "description",
        content:
          "ParBox replaces the paper parcel logbook: guards register parcels in seconds, residents claim with a QR code.",
      },
      { property: "og:title", content: "ParBox — Parcel register for apartment lobbies" },
      {
        property: "og:description",
        content:
          "ParBox replaces the paper parcel logbook: guards register parcels in seconds, residents claim with a QR code.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { me, loading } = useMe();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && me) void navigate({ to: homeForRole(me.role), replace: true });
  }, [me, loading, navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-5 py-14">
      <header className="space-y-4 text-center">
        <div className="clay mx-auto flex size-20 items-center justify-center bg-primary text-primary-foreground">
          <Boxes className="size-10" />
        </div>
        <h1 className="text-5xl font-extrabold">ParBox</h1>
        <p className="mx-auto max-w-md text-lg text-muted-foreground">
          Lobby Parcel Logbook
        </p>
        <Link
          to="/auth"
          className="clay-soft clay-press inline-flex items-center gap-2 bg-primary px-7 py-4 text-lg font-bold text-primary-foreground"
        >
          Sign In to ParBox
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <ClayCard className="space-y-2 text-center">
          <ShieldCheck className="mx-auto size-8 text-primary" />
          <h2 className="text-lg font-bold">Guards</h2>
          <p className="text-sm text-muted-foreground">Intake with photo, damage flag and shelf.</p>
        </ClayCard>
        <ClayCard className="space-y-2 text-center">
          <QrCode className="mx-auto size-8 text-primary" />
          <h2 className="text-lg font-bold">Residents</h2>
          <p className="text-sm text-muted-foreground">
            One QR per parcel, shareable with a proxy, expires in 72 hours.
          </p>
        </ClayCard>
        <ClayCard className="space-y-2 text-center">
          <PackageCheck className="mx-auto size-8 text-primary" />
          <h2 className="text-lg font-bold">Admins</h2>
          <p className="text-sm text-muted-foreground">
            Units, disputes, unclaimed timeouts and a full audit trail.
          </p>
        </ClayCard>
      </section>
    </main>
  );
}
