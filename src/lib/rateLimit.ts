const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute per IP

export function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = requests.get(identifier);

  // Lazy cleanup: delete stale entry
  if (entry && now > entry.resetAt) {
    requests.delete(identifier);
  }

  const current = requests.get(identifier);
  if (!current) {
    requests.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count++;
  return current.count > MAX_REQUESTS;
}
