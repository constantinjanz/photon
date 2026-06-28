export interface TransferSettings {
  frameRate: number;
  fragmentLength: number;
  imageMaxEdge: number;
  jpegQuality: number;
}

export type TransferPresetId = "reliable" | "fast" | "turbo";

export interface TransferPreset {
  id: TransferPresetId;
  label: string;
  caption: string;
  settings: TransferSettings;
}

export const transferPresets: Record<TransferPresetId, TransferPreset> = {
  reliable: {
    id: "reliable",
    label: "Reliable",
    caption: "steady",
    settings: {
      frameRate: 7,
      fragmentLength: 180,
      imageMaxEdge: 1024,
      jpegQuality: 0.7
    }
  },
  fast: {
    id: "fast",
    label: "Fast",
    caption: "default",
    settings: {
      frameRate: 10,
      fragmentLength: 300,
      imageMaxEdge: 1024,
      jpegQuality: 0.7
    }
  },
  turbo: {
    id: "turbo",
    label: "Turbo",
    caption: "shorter",
    settings: {
      frameRate: 12,
      fragmentLength: 360,
      imageMaxEdge: 896,
      jpegQuality: 0.62
    }
  }
};

export const transferPresetOrder: TransferPresetId[] = ["reliable", "fast", "turbo"];

export const defaultTransferSettings: TransferSettings = { ...transferPresets.fast.settings };

export const settingBounds = {
  frameRate: { min: 3, max: 12, step: 1 },
  fragmentLength: { min: 120, max: 360, step: 20 },
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
