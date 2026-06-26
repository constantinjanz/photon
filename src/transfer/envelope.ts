export interface PhotonEnvelopeHeader {
  v: 1;
  name: string;
  mime: string;
  byteLength: number;
  sha256: string;
  encrypted: false;
}

export interface ParsedEnvelope {
  header: PhotonEnvelopeHeader;
  payload: Uint8Array;
}

export class EnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvelopeError";
  }
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const maxHeaderBytes = 16 * 1024;

export function createEnvelope(header: PhotonEnvelopeHeader, payload: Uint8Array): Uint8Array {
  const normalizedHeader = {
    ...header,
    byteLength: payload.byteLength,
    encrypted: false as const,
    v: 1 as const
  };
  validateHeader(normalizedHeader);

  const headerBytes = textEncoder.encode(JSON.stringify(normalizedHeader));
  const envelope = new Uint8Array(4 + headerBytes.byteLength + payload.byteLength);
  new DataView(envelope.buffer).setUint32(0, headerBytes.byteLength, false);
  envelope.set(headerBytes, 4);
  envelope.set(payload, 4 + headerBytes.byteLength);
  return envelope;
}

export function parseEnvelope(envelope: Uint8Array): ParsedEnvelope {
  if (envelope.byteLength < 5) {
    throw new EnvelopeError("The transfer payload is too short.");
  }

  const view = new DataView(envelope.buffer, envelope.byteOffset, envelope.byteLength);
  const headerLength = view.getUint32(0, false);

  if (headerLength === 0 || headerLength > maxHeaderBytes) {
    throw new EnvelopeError("The transfer header is not valid.");
  }

  if (4 + headerLength > envelope.byteLength) {
    throw new EnvelopeError("The transfer header is incomplete.");
  }

  const headerBytes = envelope.slice(4, 4 + headerLength);
  const payload = envelope.slice(4 + headerLength);
  const header = parseHeader(headerBytes);

  if (payload.byteLength !== header.byteLength) {
    throw new EnvelopeError("The received photo length does not match the transfer header.");
  }

  return { header, payload };
}

function parseHeader(headerBytes: Uint8Array): PhotonEnvelopeHeader {
  try {
    const parsed = JSON.parse(textDecoder.decode(headerBytes)) as PhotonEnvelopeHeader;
    validateHeader(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof EnvelopeError) {
      throw error;
    }
    throw new EnvelopeError("The transfer header could not be read.");
  }
}

function validateHeader(header: PhotonEnvelopeHeader): void {
  if (header.v !== 1) {
    throw new EnvelopeError("This transfer was made by an unsupported Photon version.");
  }

  if (header.encrypted !== false) {
    throw new EnvelopeError("Encrypted transfers are not supported in this version.");
  }

  if (!header.name || header.name.length > 240) {
    throw new EnvelopeError("The transfer filename is not valid.");
  }

  if (!header.mime.startsWith("image/")) {
    throw new EnvelopeError("Photon v1 only accepts image transfers.");
  }

  if (!Number.isSafeInteger(header.byteLength) || header.byteLength < 0) {
    throw new EnvelopeError("The transfer byte length is not valid.");
  }

  if (!/^[a-f0-9]{64}$/i.test(header.sha256)) {
    throw new EnvelopeError("The transfer checksum is not valid.");
  }
}
