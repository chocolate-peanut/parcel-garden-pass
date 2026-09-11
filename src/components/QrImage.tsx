import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

export function QrImage({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#243d2e", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => setSrc(""));
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div className={cn("clay inline-flex items-center justify-center bg-card p-4", className)}>
      {src ? (
        <img src={src} width={size} height={size} alt="Parcel claim QR code" className="rounded-xl" />
      ) : (
        <div style={{ width: size, height: size }} className="clay-inset animate-pulse" />
      )}
    </div>
  );
}
