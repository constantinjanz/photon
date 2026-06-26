import { normalizeSettings } from "./settings";

test("normalizes settings into supported ranges", () => {
  expect(
    normalizeSettings({
      frameRate: 99,
      fragmentLength: 12,
      imageMaxEdge: 9999,
      jpegQuality: 1
    }),
  ).toEqual({
    frameRate: 12,
    fragmentLength: 120,
    imageMaxEdge: 1600,
    jpegQuality: 0.85
  });
});
