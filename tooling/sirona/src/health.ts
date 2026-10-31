// Foundation diagnostics only: no session credentials or product mutations.
export function backendOrigin(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Use an HTTP 127.0.0.1 backend origin without credentials or a path')
  }
  return url.origin
}
export interface HealthResult { live: boolean; ready: boolean }
export async function inspectHealth(origin: string, request: typeof fetch = fetch): Promise<HealthResult> {
  const base = backendOrigin(origin)
  const probe = async (path: string) => {
    try {
      const response = await request(`${base}${path}`, { redirect: 'error', signal: AbortSignal.timeout(3000) })
      await response.body?.cancel()
      return response.ok
    } catch { return false }
  }
  const [live, ready] = await Promise.all([probe('/health/live'), probe('/health/ready')])
  return { live, ready }
}
