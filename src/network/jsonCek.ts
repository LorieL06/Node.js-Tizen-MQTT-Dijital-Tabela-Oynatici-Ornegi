export type FetchJsonOptions = { timeoutMs?: number; retries?: number; backoffBaseMs?: number };
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
export async function jsonCek<T>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = 8000, retries = 2, backoffBaseMs = 500 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as T;
      return json;
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(t);
    }
    if (attempt < retries) {
      const delay = backoffBaseMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("jsonCek failed");
}
