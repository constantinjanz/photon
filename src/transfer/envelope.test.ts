import { createEnvelope, parseEnvelope, type PhotonEnvelopeHeader } from "./envelope";
import { verifyDecodedEnvelope } from "./verify";

const baseHeader: PhotonEnvelopeHeader = {
  v: 1,
  name: "photo.jpg",
  mime: "image/jpeg",
  byteLength: 0,
  sha256: "a".repeat(64),
  encrypted: false
};

test("round-trips the Photon envelope", () => {
  const payload = new Uint8Array([1, 2, 3, 4, 5]);
  const envelope = createEnvelope(baseHeader, payload);
  const parsed = parseEnvelope(envelope);

  expect(parsed.header).toEqual({ ...baseHeader, byteLength: payload.byteLength });
  expect(Array.from(parsed.payload)).toEqual(Array.from(payload));
});

test("rejects a mismatched payload hash", async () => {
  const payload = new Uint8Array([9, 8, 7]);
  const envelope = createEnvelope(baseHeader, payload);

  await expect(verifyDecodedEnvelope(envelope)).rejects.toThrow("Something went wrong");
});
