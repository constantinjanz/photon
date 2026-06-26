import { Buffer } from "buffer";

type BcUrModule = typeof import("@ngraveio/bc-ur");

export interface PhotonUrEncoder {
  readonly estimatedPartCount: number;
  readonly messageLength: number;
  nextPart(): string;
}

export interface DecodeState {
  accepted: boolean;
  complete: boolean;
  success: boolean;
  progress: number;
  estimatedProgress: number;
  expectedPartCount: number;
  receivedPartCount: number;
  payload?: Uint8Array;
  error?: string;
}

export interface PhotonUrDecoder {
  receivePart(part: string): DecodeState;
  snapshot(): DecodeState;
}

let bcUrPromise: Promise<BcUrModule> | undefined;

export async function createUrEncoder(bytes: Uint8Array, maxFragmentLength: number): Promise<PhotonUrEncoder> {
  const bcUr = await loadBcUr();
  const ur = bcUr.UR.fromBuffer(Buffer.from(bytes));
  const encoder = new bcUr.UREncoder(ur, maxFragmentLength, 0);

  return {
    estimatedPartCount: encoder.fragmentsLength,
    messageLength: encoder.messageLength,
    nextPart: () => encoder.nextPart()
  };
}

export async function createUrDecoder(): Promise<PhotonUrDecoder> {
  const bcUr = await loadBcUr();
  const decoder = new bcUr.URDecoder(undefined, "bytes");

  const snapshot = (accepted: boolean): DecodeState => {
    const complete = Boolean(decoder.isComplete());
    const success = Boolean(decoder.isSuccess());
    const progress = clampProgress(decoder.getProgress());
    const estimatedProgress = clampProgress(decoder.estimatedPercentComplete());
    const expectedPartCount = decoder.expectedPartCount();
    const receivedPartCount = decoder.receivedPartIndexes().length;
    const error = decoder.isError() ? decoder.resultError() : undefined;
    const payload = success ? Uint8Array.from(decoder.resultUR().decodeCBOR()) : undefined;

    return {
      accepted,
      complete,
      success,
      progress,
      estimatedProgress,
      expectedPartCount,
      receivedPartCount,
      payload,
      error
    };
  };

  return {
    receivePart(part: string) {
      const normalized = part.trim();

      if (!normalized.toLowerCase().startsWith("ur:")) {
        return snapshot(false);
      }

      try {
        const accepted = decoder.receivePart(normalized);
        return snapshot(accepted);
      } catch (error) {
        return {
          ...snapshot(false),
          error: error instanceof Error ? error.message : "Photon could not read that QR frame."
        };
      }
    },
    snapshot: () => snapshot(false)
  };
}

async function loadBcUr(): Promise<BcUrModule> {
  const globalWithBuffer = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
  globalWithBuffer.Buffer ??= Buffer;
  bcUrPromise ??= import("@ngraveio/bc-ur");
  return bcUrPromise;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
