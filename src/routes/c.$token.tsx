import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { QrImage } from "@/components/QrImage";
import { ClayCard } from "@/components/clay";

export const Route = createFileRoute("/c/$token")({
  head: () => ({
    meta: [
      { title: "Parcel pickup code — ParBox" },
      {
        name: "description",
        content: "Show this ParBox pickup code at the lobby desk to collect the parcel.",
      },
      { property: "og:title", content: "Parcel pickup code — ParBox" },
      {
        property: "og:description",
        content: "Show this ParBox pickup code at the lobby desk to collect the parcel.",
      },
    ],
  }),
  component: SharedClaim,
});

function SharedClaim() {
  const { token } = Route.useParams();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <div className="clay flex size-14 items-center justify-center bg-primary text-primary-foreground">
        <Boxes className="size-7" />
      </div>
      <h1 className="text-3xl font-extrabold">Parcel pickup code</h1>
      <p className="text-muted-foreground">
        Show this code to the guard at the lobby desk. It works once, then it stops working.
      </p>
      <QrImage value={token} size={240} />
      <ClayCard className="w-full">
        <p className="text-sm font-semibold text-muted-foreground">Manual code</p>
        <p className="font-mono text-lg font-bold tracking-widest break-all">{token}</p>
      </ClayCard>
    </main>
  );
}
