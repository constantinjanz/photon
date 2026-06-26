export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("SHA-256 is unavailable in this browser. Open Photon over HTTPS or localhost.");
  }

  const source = Uint8Array.from(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", source);
  return bytesToHex(new Uint8Array(digest));
}
