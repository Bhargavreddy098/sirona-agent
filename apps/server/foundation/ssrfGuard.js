// @ts-check
import dns from "node:dns/promises";
import net from "node:net";

/**
 * Checks if an IP string is an IPv4 or IPv6 loopback address.
 * @param {string} ip
 * @returns {boolean}
 */
export function isLoopbackIp(ip) {
  if (!ip) return false;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") return true;
  if (ip.startsWith("127.")) return true;
  return false;
}

/**
 * Checks whether an IP belongs to standard RFC 1918 private subnets.
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateIp(ip) {
  const normalized = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (!net.isIPv4(normalized)) return false;
  const [a, b] = normalized.split(".").map(Number);
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  return false;
}

/**
 * Checks if an IP string is a cloud metadata, link-local, carrier-grade NAT, or forbidden address.
 * @param {string} ip
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function isForbiddenIp(ip) {
  if (!ip) return { blocked: true, reason: "Empty IP address" };

  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:169.254.169.254 or ::ffff:a9fe:a9fe)
  let normalized = ip.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    const remainder = normalized.slice(7);
    if (remainder.includes(".")) {
      normalized = remainder;
    } else if (remainder.includes(":")) {
      const parts = remainder.split(":");
      if (parts.length === 2) {
        const h1 = parseInt(parts[0], 16);
        const h2 = parseInt(parts[1], 16);
        if (!isNaN(h1) && !isNaN(h2)) {
          normalized = `${(h1 >> 8) & 0xff}.${h1 & 0xff}.${(h2 >> 8) & 0xff}.${h2 & 0xff}`;
        }
      }
    }
  }

  // Cloud metadata exact IPs
  if (normalized === "169.254.169.254" || normalized === "169.254.169.253" || normalized === "fd00:ec2::254") {
    return { blocked: true, reason: "Cloud metadata service destination is forbidden" };
  }

  // IPv4 Link-local block: 169.254.0.0/16
  if (net.isIPv4(normalized)) {
    const parts = normalized.split(".").map(Number);
    if (parts[0] === 169 && parts[1] === 254) {
      return { blocked: true, reason: "Link-local address (169.254.0.0/16) is forbidden" };
    }
    // 0.0.0.0/8 (current network)
    if (parts[0] === 0) {
      return { blocked: true, reason: "Zero network address is forbidden" };
    }
    // Carrier Grade NAT: 100.64.0.0/10 (100.64.0.0 - 100.127.255.255)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) {
      return { blocked: true, reason: "Carrier-grade NAT address is forbidden" };
    }
    // Broadcast: 255.255.255.255
    if (normalized === "255.255.255.255") {
      return { blocked: true, reason: "Broadcast address is forbidden" };
    }
  }

  // IPv6 Link-local block: fe80::/10
  if (net.isIPv6(normalized)) {
    const lower = normalized.toLowerCase();
    if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
      return { blocked: true, reason: "IPv6 link-local address (fe80::/10) is forbidden" };
    }
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") {
      return { blocked: true, reason: "IPv6 unspecified address is forbidden" };
    }
  }

  return { blocked: false };
}

/**
 * Validates whether a target endpoint URL is safe from SSRF attacks.
 * @param {string} urlStr
 * @param {{ allowLoopback?: boolean, allowPrivate?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, url: URL | null, reason?: string }>}
 */
export async function validateSafeEndpointUrl(urlStr, { allowLoopback = true, allowPrivate = false } = {}) {
  if (!urlStr || typeof urlStr !== "string") {
    return { ok: false, url: null, reason: "URL must be a non-empty string" };
  }

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { ok: false, url: null, reason: "Invalid URL syntax" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, url: parsed, reason: `Protocol '${parsed.protocol}' is forbidden; only http and https are permitted` };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Check forbidden domain names
  const forbiddenDomains = [
    "metadata.google.internal",
    "metadata.google",
    "metadata",
    "instance-data",
    "169.254.169.254",
  ];
  if (forbiddenDomains.includes(hostname)) {
    return { ok: false, url: parsed, reason: `Target host '${hostname}' is a forbidden cloud metadata endpoint` };
  }

  // Check if host is loopback
  const isLoopback = hostname === "localhost" || isLoopbackIp(hostname);
  if (isLoopback) {
    if (!allowLoopback) {
      return { ok: false, url: parsed, reason: "Loopback endpoints are not permitted for this provider" };
    }
    return { ok: true, url: parsed };
  }

  // If host is an IP literal
  if (net.isIP(hostname)) {
    const ipCheck = isForbiddenIp(hostname);
    if (ipCheck.blocked) {
      return { ok: false, url: parsed, reason: ipCheck.reason };
    }

    if (!allowPrivate && isPrivateIp(hostname)) {
      return { ok: false, url: parsed, reason: "Private network IP addresses are forbidden without explicit authorization" };
    }

    return { ok: true, url: parsed };
  }

  // Host is a domain name: perform DNS resolution check to guard against DNS rebinding & resolution to metadata
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      const check = isForbiddenIp(addr.address);
      if (check.blocked) {
        return { ok: false, url: parsed, reason: `Host '${hostname}' resolves to forbidden destination: ${addr.address} (${check.reason})` };
      }
      if (!allowLoopback && isLoopbackIp(addr.address)) {
        return { ok: false, url: parsed, reason: `Host '${hostname}' resolves to loopback IP: ${addr.address}` };
      }
      if (!allowPrivate && !isLoopbackIp(addr.address) && isPrivateIp(addr.address)) {
        return { ok: false, url: parsed, reason: `Host '${hostname}' resolves to private network IP: ${addr.address}` };
      }
    }
  } catch (dnsErr) {
    return { ok: false, url: parsed, reason: `DNS resolution failed for '${hostname}': ${dnsErr.message}` };
  }

  return { ok: true, url: parsed };
}

/**
 * Safe fetch wrapper that enforces SSRF checks, manual redirect validation, and timeouts.
 * Never disables TLS validation.
 * @param {string} urlStr
 * @param {RequestInit & { timeoutMs?: number, allowLoopback?: boolean, allowPrivate?: boolean }} [options]
 * @returns {Promise<Response>}
 */
export async function safeFetch(urlStr, options = {}) {
  const { timeoutMs = 15000, allowLoopback = true, allowPrivate = false, headers, method = "GET", body } = options;

  let currentUrl = urlStr;
  let maxRedirects = 3;

  while (maxRedirects >= 0) {
    const validation = await validateSafeEndpointUrl(currentUrl, { allowLoopback, allowPrivate });
    if (!validation.ok) {
      throw Object.assign(new Error(`SSRF validation failed: ${validation.reason}`), {
        code: "SSRF_BLOCKED",
        status: 400,
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);

    // Merge external abort signal if provided
    let externalSignal = options.signal;
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason));
    }

    try {
      const res = await fetch(currentUrl, {
        method,
        headers,
        body,
        redirect: "manual", // Do NOT follow redirects automatically to prevent SSRF bypass
        signal: controller.signal,
      });

      // Handle redirects explicitly
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) {
          throw Object.assign(new Error("Redirect missing Location header"), { code: "INVALID_REDIRECT", status: 502 });
        }
        currentUrl = new URL(location, currentUrl).href;
        maxRedirects--;
        continue;
      }

      return res;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw Object.assign(new Error("Exceeded maximum redirects (3)"), { code: "TOO_MANY_REDIRECTS", status: 502 });
}
