import { createUrDecoder, createUrEncoder } from "./bcUr";

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
