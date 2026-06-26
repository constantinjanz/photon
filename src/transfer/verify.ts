import { sha256Hex } from "./crypto";
import { parseEnvelope, type ParsedEnvelope } from "./envelope";

export class IntegrityError extends Error {
  constructor(message = "Something went wrong - let's try again.") {
    super(message);
    this.name = "IntegrityError";
  }
}

export async function verifyDecodedEnvelope(envelopeBytes: Uint8Array): Promise<ParsedEnvelope> {
  const parsed = parseEnvelope(envelopeBytes);
  const actualHash = await sha256Hex(parsed.payload);

  if (actualHash.toLowerCase() !== parsed.header.sha256.toLowerCase()) {
    throw new IntegrityError();
  }

  return parsed;
}
