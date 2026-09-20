import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowUpRight, PackageCheck, QrCode, ShieldCheck, Boxes } from "lucide-react";
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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-10 sm:px-8">
      <div className="mb-10 flex flex-col items-center text-center sm:mb-14">
        <div className="clay mb-5 flex size-16 items-center justify-center bg-secondary/60 text-foreground">
          <Boxes className="size-8" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold sm:text-5xl">ParBox</h1>
        <p className="mt-3 text-sm font-medium uppercase text-muted-foreground">Lobby Parcel Register</p>
      </div>

      <section className="grid w-full gap-4 md:grid-cols-3 md:gap-5">
        {OPTIONS.map(({ role, icon: Icon, title, text }) => (
          <Link
            key={role}
            to="/auth"
            search={{ role }}
            className="clay clay-press group flex min-h-64 flex-col items-center p-7 text-center transition-transform duration-300 hover:-translate-y-1"
          >
            <span className="clay-inset mb-6 flex size-14 items-center justify-center rounded-full text-primary transition-colors group-hover:bg-primary/15">
              <Icon className="size-6" strokeWidth={1.6} />
            </span>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            <span className="mt-auto flex items-center gap-1 pt-7 text-xs font-semibold uppercase text-primary">
              Continue <ArrowUpRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </section>
      <p className="mt-10 text-center text-xs text-muted-foreground">Secure parcel handover for your building</p>
    </main>
  );
}
