import ipaddr from 'ipaddr.js';

/**
 * Pure SSRF classification (no I/O — exhaustively unit-testable). The
 * DNS resolution and the schema/protocol check live in `ssrf-fetch.ts`; this
 * module only answers "is this IP (or its embedded IPv4) public?" and
 * normalises the non-dotted host special forms (decimal/hex/octal/shorthand)
 * that a naive resolver might handle differently (AK-1.4, ADR-0058 §5.3).
 */

type IPv4 = InstanceType<typeof ipaddr.IPv4>;
type IPv6 = InstanceType<typeof ipaddr.IPv6>;

/** Convert a uint32 to a dotted-quad string (2130706433 → 127.0.0.1). */
function intToQuad(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

/** The embedded IPv4 of a NAT64 / IPv4-mapped / -compatible IPv6 (last 32 bits). */
function embeddedIpv4(parts: number[]): number {
  return ((parts[6] ?? 0) << 16) | (parts[7] ?? 0);
}

/** `::a.b.c.d` (IPv4-compatible) — ipaddr.js 1.x cannot parse it; unpack it. */
function ipv4CompatibleAddress(address: string): string | null {
  const match = /^::((?:\d{1,3}\.){3}\d{1,3})$/.exec(address);
  return match ? (match[1] ?? null) : null;
}

/** A single IPv4 literal is public: globally routable unicast, not benchmarking. */
function isPublicIpv4(addr: string): boolean {
  const ip = ipaddr.parse(addr);
  if (ip.kind() !== 'ipv4') return false;
  const ipv4 = ip as IPv4;
  if (ipv4.range() !== 'unicast') return false;
  const a = ipv4.octets[0] ?? 0;
  const b = ipv4.octets[1] ?? 0;
  // 198.18.0.0/15 (benchmarking) is reported "unicast" by ipaddr.js but is not
  // publicly routable — reject it explicitly.
  if (a === 198 && (b === 18 || b === 19)) return false;
  return true;
}

/**
 * True when `address` (an IPv4 or IPv6 literal) is publicly routable. IPv4-
 * mapped/-compatible IPv6 and NAT64 are unpacked and the embedded IPv4 is
 * re-classified; every non-unicast range (loopback, link-local, ULA, multicast,
 * unspecified, 6to4, teredo) is rejected.
 */
export function isPublicAddress(address: string): boolean {
  // URL hostnames carry brackets around IPv6 literals; classify the bare form.
  const bare = address.startsWith('[') && address.endsWith(']') ? address.slice(1, -1) : address;

  const compatible = ipv4CompatibleAddress(bare);
  if (compatible) return isPublicIpv4(compatible);

  const ip = ipaddr.parse(bare);
  if (ip.kind() === 'ipv4') return isPublicIpv4(bare);

  const ipv6 = ip as IPv6;
  if (ipv6.isIPv4MappedAddress()) return isPublicIpv4(ipv6.toIPv4Address().toString());
  if (ipv6.range() === 'rfc6052') return isPublicIpv4(intToQuad(embeddedIpv4(ipv6.parts)));

  return ipv6.range() === 'unicast';
}

/**
 * The core guard: `true` only when **every** resolved address is public. Any
 * single private/loopback/link-local address rejects the whole resolution
 * (conservative — a host may resolve to both A and AAAA, and only one has to
 * point inward).
 */
export function classifyAddresses(addresses: string[]): boolean {
  return addresses.every((address) => isPublicAddress(address));
}

/**
 * Parse one dotted octet: a leading-zero group is octal (`0177` → 127), else
 * decimal. Returns `null` for anything else.
 */
function parseOctet(part: string): number | null {
  if (/^0[0-7]*$/.test(part)) return parseInt(part, 8);
  if (/^\d+$/.test(part)) return parseInt(part, 10);
  return null;
}

/**
 * Normalise a host's non-dotted special forms into a dotted quad, so they are
 * classified **before** any DNS resolution (AK-1.4 — `2130706433`, `0x7f000001`,
 * `0177.0.0.1`, `127.1`). Returns `null` when the host is a regular hostname,
 * an IPv6 literal, or not interpretable as an IPv4 in these forms.
 */
export function normalizeSpecialHost(host: string): string | null {
  const h = host.trim();
  if (h === '') return null;

  // Single decimal integer (2130706433).
  if (/^\d+$/.test(h)) {
    const n = Number(h);
    return n >= 0 && n <= 0xffffffff ? intToQuad(n) : null;
  }

  // Hexadecimal (0x7f000001).
  if (/^0x[0-9a-f]+$/i.test(h)) {
    const n = parseInt(h.slice(2), 16);
    return Number.isNaN(n) || n < 0 || n > 0xffffffff ? null : intToQuad(n);
  }

  // Dotted decimal/octal with inet_aton-style shorthand: a.b → a.0.0.b,
  // a.b.c → a.b.0.c, a → a.0.0.0.
  const parts = h.split('.');
  if (parts.length >= 1 && parts.length <= 4 && parts.every((p) => p !== '')) {
    const octets = parts.map(parseOctet);
    if (octets.some((o) => o === null)) return null;
    const o = octets as number[];
    if (o.some((x) => x < 0 || x > 255)) return null;
    if (o.length === 4) return o.join('.');
    if (o.length === 3) return [o[0], o[1], 0, o[2]].join('.');
    if (o.length === 2) return [o[0], 0, 0, o[1]].join('.');
    return [o[0], 0, 0, 0].join('.');
  }

  return null;
}
