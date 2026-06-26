export interface TransferSettings {
  frameRate: number;
  fragmentLength: number;
  imageMaxEdge: number;
  jpegQuality: number;
}

export const defaultTransferSettings: TransferSettings = {
  frameRate: 7,
  fragmentLength: 180,
  imageMaxEdge: 1024,
  jpegQuality: 0.7
};

export const settingBounds = {
  frameRate: { min: 3, max: 12, step: 1 },
  fragmentLength: { min: 120, max: 320, step: 20 },
  imageMaxEdge: { min: 640, max: 1600, step: 64 },
  jpegQuality: { min: 0.45, max: 0.85, step: 0.05 }
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeSettings(settings: TransferSettings): TransferSettings {
  return {
    frameRate: Math.round(clamp(settings.frameRate, settingBounds.frameRate.min, settingBounds.frameRate.max)),
    fragmentLength: Math.round(
      clamp(settings.fragmentLength, settingBounds.fragmentLength.min, settingBounds.fragmentLength.max),
    ),
    imageMaxEdge: Math.round(
      clamp(settings.imageMaxEdge, settingBounds.imageMaxEdge.min, settingBounds.imageMaxEdge.max),
    ),
    jpegQuality: Number(
      clamp(settings.jpegQuality, settingBounds.jpegQuality.min, settingBounds.jpegQuality.max).toFixed(2),
    )
  };
}
