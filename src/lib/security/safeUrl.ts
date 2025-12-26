import "server-only";

import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const MAX_DNS_ADDRESSES = 25;

function isBlockedIp(address: string): boolean {
  const zoneIndex = address.indexOf("%");
  const normalized = (zoneIndex === -1 ? address : address.slice(0, zoneIndex)).toLowerCase();

  const ipVersion = net.isIP(normalized);
  if (!ipVersion) return true;

  if (ipVersion === 4) {
    const parts = normalized.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true;
    }

    const [a, b] = parts;
    if (a === 0) return true; // "this network" / unspecified
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reserved
    return false;
  }

  const bytes = parseIpv6Bytes(normalized);
  if (!bytes) return true;

  const isAllZero = bytes.every((b) => b === 0);
  if (isAllZero) return true; // ::

  const isLoopback = bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1;
  if (isLoopback) return true; // ::1

  const isMulticast = bytes[0] === 0xff;
  if (isMulticast) return true;

  const isUniqueLocal = (bytes[0] & 0xfe) === 0xfc; // fc00::/7
  if (isUniqueLocal) return true;

  const isLinkLocal = bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80; // fe80::/10
  if (isLinkLocal) return true;

  const isIpv4Compatible = bytes.slice(0, 12).every((b) => b === 0);
  if (isIpv4Compatible) {
    const ipv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isBlockedIp(ipv4);
  }

  const isIpv4Mapped =
    bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  if (isIpv4Mapped) {
    const ipv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isBlockedIp(ipv4);
  }

  return false;
}

function parseIpv6Bytes(address: string): number[] | null {
  const hasIpv4 = address.includes(".");
  let input = address;

  if (hasIpv4) {
    const lastColon = input.lastIndexOf(":");
    if (lastColon === -1) return null;
    const ipv4Part = input.slice(lastColon + 1);
    const parts = ipv4Part.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return null;
    }
    const left = input.slice(0, lastColon);
    const hextet1 = ((parts[0] as number) << 8) | (parts[1] as number);
    const hextet2 = ((parts[2] as number) << 8) | (parts[3] as number);
    input = `${left}:${hextet1.toString(16)}:${hextet2.toString(16)}`;
  }

  const [leftRaw, rightRaw] = input.split("::", 2);
  const leftParts = leftRaw ? leftRaw.split(":").filter(Boolean) : [];
  const rightParts = rightRaw ? rightRaw.split(":").filter(Boolean) : [];

  if (input.includes("::")) {
    if (rightRaw === undefined) return null;
  } else if (rightParts.length > 0) {
    return null;
  }

  const totalHextets = leftParts.length + rightParts.length;
  if (totalHextets > 8) return null;

  const missing = input.includes("::") ? 8 - totalHextets : 0;
  if (!input.includes("::") && totalHextets !== 8) return null;

  const hextets: number[] = [];

  for (const part of leftParts) {
    const value = Number.parseInt(part, 16);
    if (!Number.isFinite(value) || value < 0 || value > 0xffff) return null;
    hextets.push(value);
  }

  for (let i = 0; i < missing; i += 1) hextets.push(0);

  for (const part of rightParts) {
    const value = Number.parseInt(part, 16);
    if (!Number.isFinite(value) || value < 0 || value > 0xffff) return null;
    hextets.push(value);
  }

  if (hextets.length !== 8) return null;

  const bytes: number[] = [];
  for (const value of hextets) {
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }

  return bytes;
}

async function assertPublicHostname(hostname: string): Promise<void> {
  const lower = hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(lower) || lower.endsWith(".local")) {
    throw new Error("Blocked hostname.");
  }

  const addresses = await lookup(lower, { all: true, verbatim: true });
  if (addresses.length > MAX_DNS_ADDRESSES) {
    throw new Error("Hostname resolved to too many IP addresses.");
  }

  for (const entry of addresses) {
    if (isBlockedIp(entry.address)) {
      throw new Error("Hostname resolved to a blocked IP address.");
    }
  }
}

export async function assertSafeRemoteUrl(raw: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed.");
  }

  if (!url.hostname) {
    throw new Error("URL must include a hostname.");
  }

  const ipVersion = net.isIP(url.hostname);
  if (ipVersion) {
    if (isBlockedIp(url.hostname)) {
      throw new Error("Blocked IP address.");
    }
    return url;
  }

  await assertPublicHostname(url.hostname);
  return url;
}
