import { useEffect, useRef, useState } from "react";
import { activityRequest } from "./api";
import { mapPhoto } from "./mapPhoto";

// Serialize photo requests so a slow earlier save cannot overwrite the latest choice.
export function useLivePhoto(shareId: string | undefined, photo?: string) {
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    setError("");
    if (!shareId) return;
    const sync = async () => {
      try {
        const thumbnail = await mapPhoto(photo);
        if (cancelled) return;
        await activityRequest("live/photo", { shareId, photo: thumbnail });
        if (!cancelled) setError("");
      } catch (cause) {
        if (
          cancelled ||
          [401, 409].includes((cause as { status?: number }).status || 0)
        )
          return;
        setError(
          "Foto peta belum tersinkron. Akan dicoba lagi saat koneksi tersedia.",
        );
        retry = setTimeout(enqueue, 10000);
      }
    };
    const enqueue = () => {
      queue.current = queue.current.then(sync, sync);
    };
    enqueue();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
    };
  }, [shareId, photo]);
  return error;
}
