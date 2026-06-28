import { defaultTransferSettings, normalizeSettings, settingBounds, transferPresets } from "./settings";

test("uses the fast preset by default while keeping reliable and turbo options", () => {
  expect(defaultTransferSettings).toEqual(transferPresets.fast.settings);
  expect(transferPresets.reliable.settings).toEqual({
    frameRate: 7,
    fragmentLength: 180,
    imageMaxEdge: 1024,
    jpegQuality: 0.7
  });
  expect(transferPresets.turbo.settings).toEqual({
    frameRate: 12,
    fragmentLength: 360,
    imageMaxEdge: 896,
    jpegQuality: 0.62
  });
});

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

  expect(
    normalizeSettings({
      frameRate: 1,
      fragmentLength: 9999,
      imageMaxEdge: 1,
      jpegQuality: 0
    }),
  ).toEqual({
    frameRate: 3,
    fragmentLength: settingBounds.fragmentLength.max,
    imageMaxEdge: 640,
    jpegQuality: 0.45
  });
});
