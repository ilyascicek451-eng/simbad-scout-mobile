import { useCallback, useEffect, useState } from "react";
import { api, type ApiResult } from "./api";

/** Load one API resource; exposes reload so screens can refresh after an action. */
export function useApi<T>(path: string | null) {
  const [result, setResult] = useState<ApiResult<T> | null>(null);
  const load = useCallback(async () => {
    if (!path) return;
    setResult(null);
    setResult(await api<T>(path));
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { result, reload: load };
}
