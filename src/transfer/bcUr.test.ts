import { createUrDecoder, createUrEncoder } from "./bcUr";
import { sha256Hex } from "./crypto";
import { createEnvelope, type PhotonEnvelopeHeader } from "./envelope";
import { verifyDecodedEnvelope } from "./verify";

test("decodes BC-UR frames after receiving enough fountain parts", async () => {
  const payload = new TextEncoder().encode("Photon test payload ".repeat(80));
  const encoder = await createUrEncoder(payload, 160);
  const decoder = await createUrDecoder();
  let finalPayload: Uint8Array | undefined;

  for (let index = 0; index < encoder.estimatedPartCount * 4 && !finalPayload; index += 1) {
    const state = decoder.receivePart(encoder.nextPart());
    if (state.success) {
      finalPayload = state.payload;
    }
  }

  expect(finalPayload).toBeDefined();
  expect(new TextDecoder().decode(finalPayload)).toBe(new TextDecoder().decode(payload));
});

test("rebuilds and verifies a Photon envelope from shuffled fountain frames with misses", async () => {
  const photoBytes = new TextEncoder().encode("fake jpeg bytes ".repeat(220));
  const sha256 = await sha256Hex(photoBytes);
  const header: PhotonEnvelopeHeader = {
    v: 1,
    name: "phone-photo.jpg",
    mime: "image/jpeg",
    byteLength: photoBytes.byteLength,
    sha256,
    encrypted: false
  };
  const envelope = createEnvelope(header, photoBytes);
  const encoder = await createUrEncoder(envelope, 170);
  const frames = Array.from({ length: encoder.estimatedPartCount * 7 }, () => encoder.nextPart());
  const shuffledWithMisses = frames
    .filter((_, index) => index % 6 !== 0)
    .sort((left, right) => deterministicOrder(left) - deterministicOrder(right));
  const decoder = await createUrDecoder();
  let decodedEnvelope: Uint8Array | undefined;

  for (const frame of shuffledWithMisses) {
    const state = decoder.receivePart(frame);
    if (state.success) {
      decodedEnvelope = state.payload;
      break;
    }
  }

  expect(decodedEnvelope).toBeDefined();
  const verified = await verifyDecodedEnvelope(decodedEnvelope as Uint8Array);
  expect(verified.header.name).toBe("phone-photo.jpg");
  expect(new TextDecoder().decode(verified.payload)).toBe(new TextDecoder().decode(photoBytes));
});

function deterministicOrder(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
