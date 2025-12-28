const OWNER_ADDRESS_RE = /^0x[a-f0-9]{40}$/i;

export function normalizeOwnerAddress(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!OWNER_ADDRESS_RE.test(trimmed)) {
    throw new Error("ownerAddress must be a 0x-prefixed 20-byte hex string.");
  }
  return trimmed.toLowerCase();
}
