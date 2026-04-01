const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute per IP

export function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = requests.get(identifier);

  if (!entry || now > entry.resetAt) {
    requests.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return true;
  }

  return false;
}

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requests) {
    if (now > entry.resetAt) requests.delete(key);
  }
}, 60_000);
