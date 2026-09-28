/** A short description of a browser's user-agent string: "Firefox on Linux", "Safari on iPhone". */
export function describeUserAgent(userAgent: string | null | undefined): { browser: string | null; system: string | null } {
  const ua = userAgent ?? ''
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /SamsungBrowser\//.test(ua)
          ? 'Samsung Internet'
          : /Chrome\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : null
  const system = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'macOS'
            : /CrOS/.test(ua)
              ? 'ChromeOS'
              : /Linux/.test(ua)
                ? 'Linux'
                : null
  return { browser, system }
}

/** An IP address with its last part hidden: 84.15.1.2 → 84.15.1.•, 2001:db8::1 → 2001:db8:•. */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  if (ip.includes('.')) return ip.replace(/\.\d+$/, '.•')
  const parts = ip.split(':').filter(Boolean)
  return parts.length > 2 ? `${parts.slice(0, 2).join(':')}:•` : ip
}
