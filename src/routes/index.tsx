import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PackageCheck, QrCode, ShieldCheck, Boxes } from "lucide-react";
import { useMe, homeForRole } from "@/hooks/useMe";
import type { AppRole } from "@/lib/parbox";

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

const OPTIONS: { role: AppRole; icon: typeof ShieldCheck; title: string; text: string }[] = [
  {
    role: "guard",
    icon: ShieldCheck,
    title: "Guards",
    text: "Intake with photo, damage flag and shelf.",
  },
  {
    role: "resident",
    icon: QrCode,
    title: "Residents",
    text: "One QR per parcel, shareable with a proxy, expires in 72 hours.",
  },
  {
    role: "admin",
    icon: PackageCheck,
    title: "Admins",
    text: "Units, disputes, unclaimed timeouts and a full audit trail.",
  },
];

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
        <p className="mx-auto max-w-md text-lg text-muted-foreground">Lobby Parcel Logbook</p>
        <p className="text-sm font-semibold text-muted-foreground">Choose how you use ParBox:</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map(({ role, icon: Icon, title, text }) => (
          <Link
            key={role}
            to="/auth"
            search={{ role }}
            className="clay clay-press block space-y-2 p-6 text-center transition-transform hover:-translate-y-1"
          >
            <Icon className="mx-auto size-8 text-primary" />
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">{text}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
