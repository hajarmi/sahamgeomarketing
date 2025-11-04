// hooks/use-competitors.ts
import { useEffect, useState } from "react";
import type { Competitor, CompetitorListResponse } from "@/types";

export function useCompetitors(enabled: boolean) {
  const [data, setData] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const configured = process.env.NEXT_PUBLIC_API_BASE?.trim();
    const base = configured && configured.length > 0 ? configured : "/api";
    const endpoint = `${base.replace(/\/$/, "")}/competitors`;

    fetch(endpoint)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: CompetitorListResponse) => {
        if (!cancelled) setData(json.competitors || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data, loading, error };
}
