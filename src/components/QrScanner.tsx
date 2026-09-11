import { useEffect, useId, useRef, useState } from "react";
import { ClayButton } from "@/components/clay";

/**
 * Camera QR/barcode scanner. Loads html5-qrcode only in the browser.
 */
export function QrScanner({
  onResult,
  label = "Start camera",
}: {
  onResult: (text: string) => void;
  label?: string;
}) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) void s.stop().then(() => s.clear()).catch(() => undefined);
    };
  }, []);

  async function stop() {
    const s = scannerRef.current;
    scannerRef.current = null;
    setActive(false);
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
    }
  }

  async function start() {
    setError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const instance = new Html5Qrcode(regionId, { verbose: false });
      scannerRef.current = instance as unknown as { stop: () => Promise<void>; clear: () => void };
      setActive(true);
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          void stop();
          onResult(decoded.trim());
        },
        () => undefined,
      );
    } catch {
      setError("Camera unavailable. Type the code instead.");
      setActive(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        id={regionId}
        className={active ? "clay-inset overflow-hidden p-2" : "hidden"}
        style={{ minHeight: active ? 240 : 0 }}
      />
      {active ? (
        <ClayButton type="button" variant="soft" className="w-full" onClick={() => void stop()}>
          Stop camera
        </ClayButton>
      ) : (
        <ClayButton type="button" variant="soft" className="w-full" onClick={() => void start()}>
          {label}
        </ClayButton>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
