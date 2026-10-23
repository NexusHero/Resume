import {
  classifyAddresses,
  isPublicAddress,
  normalizeSpecialHost,
} from '../../src/adapters/ssrf-guard.js';

/**
 * The pure classification core (AK-1.4). DNS resolution and the schema check
 * live in `ssrf-fetch.ts`; the guard only answers "is every address public?",
 * unpacking IPv4-mapped/-compatible IPv6 and NAT64, and normalising the
 * non-dotted host special forms before they reach a resolver.
 */
describe('ssrf-guard — classifyAddresses', () => {
  it('HostLoopbackIpv4_Rejected', () => {
    expect(classifyAddresses(['127.0.0.1'])).toBe(false);
  });

  it.each(['10.0.0.1', '172.16.0.1', '192.168.1.1'])('HostRfc1918_Rejected (%s)', (addr) => {
    expect(classifyAddresses([addr])).toBe(false);
  });

  it('HostLinkLocal_Rejected', () => {
    expect(classifyAddresses(['169.254.169.254'])).toBe(false);
  });

  it('HostCgnat_Rejected', () => {
    expect(classifyAddresses(['100.64.0.1'])).toBe(false);
  });

  it('HostIpv6Loopback_Rejected', () => {
    expect(classifyAddresses(['::1'])).toBe(false);
    expect(classifyAddresses(['[::1]'])).toBe(false);
  });

  it('HostIpv6LinkLocal_Rejected', () => {
    expect(classifyAddresses(['fe80::1'])).toBe(false);
  });

  it('HostIpv6Ula_Rejected', () => {
    expect(classifyAddresses(['fc00::1'])).toBe(false);
  });

  it('HostIpv4MappedIpv6_Rejected', () => {
    expect(classifyAddresses(['::ffff:127.0.0.1'])).toBe(false);
    expect(classifyAddresses(['::ffff:10.0.0.1'])).toBe(false);
  });

  it('HostIpv4CompatibleIpv6_Rejected', () => {
    expect(classifyAddresses(['::127.0.0.1'])).toBe(false);
  });

  it('HostNat64_Rejected', () => {
    // 64:ff9b::7f00:1 — the embedded IPv4 (127.0.0.1) is re-classified.
    expect(classifyAddresses(['64:ff9b::7f00:1'])).toBe(false);
  });

  it('HostDecimalNotation_Rejected', () => {
    expect(classifyAddresses([normalizeSpecialHost('2130706433')!])).toBe(false);
    expect(classifyAddresses([normalizeSpecialHost('167772161')!])).toBe(false);
  });

  it('HostHexNotation_Rejected', () => {
    expect(classifyAddresses([normalizeSpecialHost('0x7f000001')!])).toBe(false);
  });

  it('HostOctalNotation_Rejected', () => {
    expect(classifyAddresses([normalizeSpecialHost('0177.0.0.1')!])).toBe(false);
  });

  it('HostDottedShorthand_Rejected', () => {
    expect(classifyAddresses([normalizeSpecialHost('127.1')!])).toBe(false);
    expect(classifyAddresses([normalizeSpecialHost('10.1')!])).toBe(false);
  });

  it('DottedShorthand_NormalisesToDottedQuad', () => {
    // inet_aton shorthand: a.b.c → a.b.0.c, a.b → a.0.0.b.
    expect(normalizeSpecialHost('10.0.1')).toBe('10.0.0.1');
    expect(normalizeSpecialHost('10.1')).toBe('10.0.0.1');
  });

  it('TooManyOctetsOrEmptyPart_ReturnsNull', () => {
    expect(normalizeSpecialHost('1.2.3.4.5')).toBeNull();
    expect(normalizeSpecialHost('1..2')).toBeNull();
    expect(normalizeSpecialHost('1.2.3.4.')).toBeNull();
  });

  it('HostLocalhost_Rejected', () => {
    // The actual hostname `localhost` is resolved in ssrf-fetch; the guard tests
    // the resolved address it yields.
    expect(classifyAddresses(['127.0.0.1'])).toBe(false);
  });

  it('HostPublic_Accepted', () => {
    expect(classifyAddresses(['93.184.216.34'])).toBe(true);
    expect(classifyAddresses(['2001:4860:4860::8888'])).toBe(true);
  });

  it('ClassifyAddresses_MixedResolutionOnePrivate_Rejected', () => {
    expect(classifyAddresses(['93.184.216.34', '10.0.0.1'])).toBe(false);
  });

  it('HostBenchmarkingRange_Rejected', () => {
    // 198.18.0.0/15 is "unicast" in ipaddr.js but not public.
    expect(isPublicAddress('198.18.0.1')).toBe(false);
    expect(isPublicAddress('198.19.255.255')).toBe(false);
  });
});

describe('ssrf-guard — normalizeSpecialHost', () => {
  it('Hostname_ReturnsNull', () => {
    expect(normalizeSpecialHost('example.com')).toBeNull();
    expect(normalizeSpecialHost('sub.example.co.uk')).toBeNull();
  });

  it('Ipv6Literal_ReturnsNull', () => {
    expect(normalizeSpecialHost('::1')).toBeNull();
    expect(normalizeSpecialHost('2001:db8::1')).toBeNull();
  });

  it('DecimalToDottedQuad', () => {
    expect(normalizeSpecialHost('2130706433')).toBe('127.0.0.1');
    expect(normalizeSpecialHost('167772161')).toBe('10.0.0.1');
  });

  it('OutOfRangeDecimal_ReturnsNull', () => {
    expect(normalizeSpecialHost('4294967296')).toBeNull();
  });
});
