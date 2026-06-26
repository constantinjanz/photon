import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";
import { createUrDecoder, createUrEncoder, type PhotonUrEncoder } from "./transfer/bcUr";
import { sha256Hex } from "./transfer/crypto";
import { createEnvelope, type PhotonEnvelopeHeader } from "./transfer/envelope";
import { compressImageFile, type CompressedImage } from "./transfer/image";
import { drawQrFrame } from "./transfer/qr";
import {
  defaultTransferSettings,
  normalizeSettings,
  settingBounds,
  type TransferSettings
} from "./transfer/settings";
import { verifyDecodedEnvelope } from "./transfer/verify";

type Screen = "home" | "send" | "receive";

interface PreparedTransfer {
  compressed: CompressedImage;
  envelopeBytes: Uint8Array;
  encoder: PhotonUrEncoder;
  hash: string;
  settings: TransferSettings;
}

interface ReceiveProgress {
  status: "starting" | "scanning" | "done" | "error";
  startedAt: number;
  lastFrameAt: number;
  progress: number;
  estimatedProgress: number;
  expectedPartCount: number;
  receivedPartCount: number;
  message: string;
}

interface ReceivedPhoto {
  url: string;
  name: string;
  mime: string;
  bytes: number;
}

const initialReceiveProgress = (): ReceiveProgress => ({
  status: "starting",
  startedAt: Date.now(),
  lastFrameAt: 0,
  progress: 0,
  estimatedProgress: 0,
  expectedPartCount: 0,
  receivedPartCount: 0,
  message: "Opening camera..."
});

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [settings, setSettings] = useState(defaultTransferSettings);

  return (
    <main className={`app-shell app-shell--${screen}`}>
      {screen === "home" && (
        <HomeScreen onSend={() => setScreen("send")} onReceive={() => setScreen("receive")} />
      )}
      {screen === "send" && (
        <SendScreen settings={settings} onSettingsChange={setSettings} onHome={() => setScreen("home")} />
      )}
      {screen === "receive" && <ReceiveScreen onHome={() => setScreen("home")} />}
    </main>
  );
}

function HomeScreen({ onSend, onReceive }: { onSend: () => void; onReceive: () => void }) {
  return (
    <section className="home-layout">
      <div className="home-copy">
        <p className="eyebrow">Photon</p>
        <h1>Send a photo phone-to-phone with nothing in between.</h1>
        <p className="lede">
          No upload, no server, no account. Once Photon is loaded or installed, the transfer works on
          airplane mode.
        </p>
        <div className="action-row">
          <button className="button button--primary" onClick={onSend}>
            Send a photo
          </button>
          <button className="button button--secondary" onClick={onReceive}>
            Receive a photo
          </button>
        </div>
      </div>

      <details className="privacy-note">
        <summary>How private is this?</summary>
        <div className="privacy-note__body">
          <p>
            The photo is compressed and encoded in your browser, then shown as QR frames. The other phone
            rebuilds it from the camera feed. There is no account, backend, upload, telemetry, or tracker in
            the transfer.
          </p>
          <p>
            The first page load is still a normal web request to the host. After the app is cached or
            installed, transfers need no internet connection. A visible QR animation can be read by people or
            cameras nearby, and the received photo is saved on the receiver's device.
          </p>
        </div>
      </details>
    </section>
  );
}

function SendScreen({
  settings,
  onSettingsChange,
  onHome
}: {
  settings: TransferSettings;
  onSettingsChange: (settings: TransferSettings) => void;
  onHome: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<PreparedTransfer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [frameCount, setFrameCount] = useState(0);

  const needsRebuild = Boolean(
    prepared &&
      (prepared.settings.fragmentLength !== settings.fragmentLength ||
        prepared.settings.imageMaxEdge !== settings.imageMaxEdge ||
        prepared.settings.jpegQuality !== settings.jpegQuality),
  );

  useEffect(() => {
    if (!prepared || !canvasRef.current || needsRebuild) {
      return;
    }

    let cancelled = false;
    let timer = 0;
    const interval = Math.round(1000 / settings.frameRate);

    const drawNextFrame = async () => {
      try {
        const part = prepared.encoder.nextPart();
        await drawQrFrame(canvasRef.current as HTMLCanvasElement, part);
        setFrameCount((count) => count + 1);
      } catch (drawError) {
        setError(drawError instanceof Error ? drawError.message : "Photon could not draw that QR frame.");
        return;
      }

      if (!cancelled) {
        timer = window.setTimeout(drawNextFrame, interval);
      }
    };

    void drawNextFrame();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [needsRebuild, prepared, settings.frameRate]);

  async function preparePhoto(nextFile = file) {
    if (!nextFile) {
      setError("Choose a photo first.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      // Sender pipeline: shrink locally, hash locally, wrap locally, then stream as BC-UR QR frames.
      const compressed = await compressImageFile(nextFile, settings);
      const hash = await sha256Hex(compressed.bytes);
      const header: PhotonEnvelopeHeader = {
        v: 1,
        name: compressed.name,
        mime: compressed.mime,
        byteLength: compressed.bytes.byteLength,
        sha256: hash,
        encrypted: false
      };
      const envelopeBytes = createEnvelope(header, compressed.bytes);
      const encoder = await createUrEncoder(envelopeBytes, settings.fragmentLength);
      setPrepared({ compressed, envelopeBytes, encoder, hash, settings });
      setFrameCount(0);
    } catch (prepareError) {
      setPrepared(null);
      setError(prepareError instanceof Error ? prepareError.message : "Photon could not prepare that photo.");
    } finally {
      setBusy(false);
    }
  }

  function chooseFile(nextFile: File | undefined) {
    if (!nextFile) {
      return;
    }
    setFile(nextFile);
    setPrepared(null);
    setError("");
    void preparePhoto(nextFile);
  }

  return (
    <section className="flow flow--send">
      <TopBar title="Send" onHome={onHome} />

      <div className="send-grid">
        <section className="control-panel">
          <label className="file-picker">
            <span>{file ? "Choose another photo" : "Choose photo"}</span>
            <input type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files?.[0])} />
          </label>

          <SettingsPanel settings={settings} onChange={onSettingsChange} />

          {file && (
            <button className="button button--secondary button--full" onClick={() => void preparePhoto()} disabled={busy}>
              {busy ? "Preparing..." : prepared && !needsRebuild ? "Rebuild stream" : "Apply settings"}
            </button>
          )}

          {error && <p className="status status--error">{error}</p>}

          {prepared && (
            <div className="transfer-stats" aria-live="polite">
              <span>{formatBytes(prepared.compressed.originalBytes)} original</span>
              <span>{formatBytes(prepared.compressed.bytes.byteLength)} sending</span>
              <span>{prepared.encoder.estimatedPartCount} base parts</span>
            </div>
          )}
        </section>

        <section className="qr-stage" aria-live="polite">
          {prepared && !needsRebuild ? (
            <>
              <canvas ref={canvasRef} className="qr-canvas" aria-label="Animated transfer QR code" />
              <p className="qr-guidance">
                Have your friend choose Receive and point their camera here. Keep this on screen until they say
                Done. Turn brightness up.
              </p>
              <div className="qr-meta">
                <span>{settings.frameRate} fps</span>
                <span>{settings.fragmentLength} fragment length</span>
                <span>{frameCount} frames shown</span>
              </div>
              <button className="button button--ghost" onClick={onHome}>
                Stop
              </button>
            </>
          ) : (
            <div className="empty-state">
              <p>{needsRebuild ? "Apply settings to rebuild the QR stream." : "Choose a photo to start."}</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function ReceiveScreen({ onHome }: { onHome: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultUrlRef = useRef<string>("");
  const [restartKey, setRestartKey] = useState(0);
  const [progress, setProgress] = useState(initialReceiveProgress);
  const [photo, setPhoto] = useState<ReceivedPhoto | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let scanner: QrScanner | undefined;
    let cancelled = false;
    let finishing = false;

    const start = async () => {
      setPhoto(null);
      setProgress(initialReceiveProgress());
      const decoder = await createUrDecoder();

      scanner = new QrScanner(
        video,
        (result) => {
          if (finishing) {
            return;
          }

          const state = decoder.receivePart(result.data);
          if (!state.accepted) {
            return;
          }

          const timestamp = Date.now();
          setProgress((current) => ({
            ...current,
            status: "scanning",
            lastFrameAt: timestamp,
            progress: state.progress,
            estimatedProgress: state.estimatedProgress,
            expectedPartCount: state.expectedPartCount,
            receivedPartCount: state.receivedPartCount,
            message: "Reading frames..."
          }));

          if (state.success && state.payload) {
            finishing = true;
            scanner?.stop();
            void finishTransfer(state.payload);
          }
        },
        {
          preferredCamera: "environment",
          maxScansPerSecond: 18,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
          calculateScanRegion: (sourceVideo) => {
            const smallest = Math.min(sourceVideo.videoWidth, sourceVideo.videoHeight);
            const size = Math.round(smallest * 0.72);
            return {
              x: Math.round((sourceVideo.videoWidth - size) / 2),
              y: Math.round((sourceVideo.videoHeight - size) / 2),
              width: size,
              height: size,
              downScaledWidth: 520,
              downScaledHeight: 520
            };
          },
          onDecodeError: () => undefined
        },
      );

      try {
        await scanner.start();
        if (!cancelled) {
          setProgress((current) => ({ ...current, status: "scanning", message: "Point at your friend's screen." }));
        }
      } catch (error) {
        if (!cancelled) {
          setProgress((current) => ({
            ...current,
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Camera access failed. Photon needs HTTPS or localhost for camera access."
          }));
        }
      }
    };

    const finishTransfer = async (envelopeBytes: Uint8Array) => {
      try {
        const parsed = await verifyDecodedEnvelope(envelopeBytes);
        const blob = new Blob([Uint8Array.from(parsed.payload)], { type: parsed.header.mime });
        const url = URL.createObjectURL(blob);

        if (resultUrlRef.current) {
          URL.revokeObjectURL(resultUrlRef.current);
        }
        resultUrlRef.current = url;

        setPhoto({
          url,
          name: parsed.header.name,
          mime: parsed.header.mime,
          bytes: parsed.payload.byteLength
        });
        setProgress((current) => ({
          ...current,
          status: "done",
          progress: 1,
          estimatedProgress: 1,
          message: "Done"
        }));
      } catch {
        setProgress((current) => ({
          ...current,
          status: "error",
          message: "Something went wrong - let's try again."
        }));
        window.setTimeout(() => setRestartKey((key) => key + 1), 1000);
      }
    };

    void start();

    return () => {
      cancelled = true;
      scanner?.destroy();
    };
  }, [restartKey]);

  const visibleProgress = Math.max(progress.progress, progress.estimatedProgress);
  const percent = Math.round(visibleProgress * 100);
  const showCoach =
    progress.status === "scanning" &&
    ((now - progress.startedAt > 4500 && visibleProgress < 0.03) ||
      (progress.lastFrameAt > 0 && now - progress.lastFrameAt > 3500 && visibleProgress < 1));

  return (
    <section className="flow flow--receive">
      <TopBar title="Receive" onHome={onHome} />

      <div className="receive-grid">
        <section className="camera-stage">
          {!photo && <video ref={videoRef} className="camera-video" muted playsInline />}
          {!photo && <div className="camera-frame" aria-hidden="true" />}
          {photo && (
            <div className="result-preview">
              <img src={photo.url} alt="Received photo" />
            </div>
          )}
        </section>

        <section className="receive-panel">
          <p className={`status ${progress.status === "error" ? "status--error" : ""}`}>{progress.message}</p>

          <div className="progress-block" aria-label={`Transfer progress ${percent}%`}>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${percent}%` }} />
            </div>
            <div className="progress-meta">
              <strong>{percent}%</strong>
              {progress.expectedPartCount > 0 && (
                <span>
                  {progress.receivedPartCount}/{progress.expectedPartCount} parts
                </span>
              )}
            </div>
          </div>

          {showCoach && (
            <p className="coach" aria-live="polite">
              Not seeing it - move closer, hold steady, and turn up the other screen's brightness.
            </p>
          )}

          {photo && (
            <div className="download-area">
              <p>
                {photo.name} · {formatBytes(photo.bytes)}
              </p>
              <a className="button button--primary" href={photo.url} download={photo.name}>
                Download
              </a>
              <button className="button button--secondary" onClick={() => setRestartKey((key) => key + 1)}>
                Receive another
              </button>
            </div>
          )}

          {progress.status === "error" && !photo && (
            <button className="button button--secondary" onClick={() => setRestartKey((key) => key + 1)}>
              Try again
            </button>
          )}
        </section>
      </div>
    </section>
  );
}

function SettingsPanel({
  settings,
  onChange
}: {
  settings: TransferSettings;
  onChange: (settings: TransferSettings) => void;
}) {
  function update<K extends keyof TransferSettings>(key: K, value: TransferSettings[K]) {
    onChange(normalizeSettings({ ...settings, [key]: value }));
  }

  return (
    <div className="settings-panel">
      <SliderRow
        label="QR speed"
        value={settings.frameRate}
        suffix="fps"
        min={settingBounds.frameRate.min}
        max={settingBounds.frameRate.max}
        step={settingBounds.frameRate.step}
        onChange={(value) => update("frameRate", value)}
      />
      <SliderRow
        label="Fragment size"
        value={settings.fragmentLength}
        suffix="chars"
        min={settingBounds.fragmentLength.min}
        max={settingBounds.fragmentLength.max}
        step={settingBounds.fragmentLength.step}
        onChange={(value) => update("fragmentLength", value)}
      />
      <SliderRow
        label="Image edge"
        value={settings.imageMaxEdge}
        suffix="px"
        min={settingBounds.imageMaxEdge.min}
        max={settingBounds.imageMaxEdge.max}
        step={settingBounds.imageMaxEdge.step}
        onChange={(value) => update("imageMaxEdge", value)}
      />
      <SliderRow
        label="Quality"
        value={settings.jpegQuality}
        suffix=""
        min={settingBounds.jpegQuality.min}
        max={settingBounds.jpegQuality.max}
        step={settingBounds.jpegQuality.step}
        onChange={(value) => update("jpegQuality", value)}
        format={(value) => `${Math.round(value * 100)}%`}
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
  format
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const displayValue = format ? format(value) : `${value}${suffix ? ` ${suffix}` : ""}`;

  return (
    <label className="slider-row">
      <span>
        {label}
        <strong>{displayValue}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function TopBar({ title, onHome }: { title: string; onHome: () => void }) {
  return (
    <header className="top-bar">
      <button className="button button--ghost" onClick={onHome}>
        Photon
      </button>
      <strong>{title}</strong>
    </header>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
