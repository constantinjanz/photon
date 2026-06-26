# Photon

Photon is a browser-based PWA for sending one photo from one phone to another with animated QR codes. The sending phone turns the photo into a stream of QR frames; the receiving phone watches that animation with its camera and rebuilds the photo locally.

There are no accounts, uploads, analytics, telemetry, third-party runtime scripts, fonts, CDNs, or backend services in the transfer.

## Privacy, Honestly

What Photon does:

- Compresses and encodes the photo entirely in the sender's browser.
- Sends the photo as light from one screen to another camera.
- Rebuilds and verifies the photo entirely in the receiver's browser.
- Works offline after the app has loaded or been installed.
- Avoids trackers, analytics, telemetry, and runtime network requests.

Important boundaries:

- The first page load is still a normal request to wherever Photon is hosted, so that host or CDN can see the visitor's IP at that moment.
- The QR animation is visible. Anyone nearby with a camera could record it. Photon v1 is private from the network, not from onlookers.
- The received photo is saved on the receiver's device. Privacy of that copy is then in the receiver's hands.
- Photon does not claim to be anonymous, untraceable, or encrypted. Optional passphrase encryption is intentionally left for a future version.

## How It Works

1. The sender chooses a local photo file.
2. Photon draws the photo to a canvas, resizes it, and re-encodes it as JPEG.
3. Photon computes a SHA-256 hash with Web Crypto.
4. Photon wraps filename, MIME type, byte length, hash, and image bytes into a small binary envelope.
5. `@ngraveio/bc-ur` turns that envelope into fountain-code UR frames.
6. `qrcode` draws each UR frame to a canvas as a looping animated QR code.
7. `qr-scanner` reads frames from the receiver's camera.
8. `@ngraveio/bc-ur` rebuilds the envelope once enough frames arrive.
9. Photon verifies the SHA-256 hash before showing a preview and Download button.

## Run Locally

PowerShell on this machine blocks `npm.ps1`, so use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

Then open the local URL Vite prints, usually `http://localhost:5173`.

Useful commands:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

## Testing On Two Real Phones

A second phone cannot reach your computer's `localhost`, and phone camera APIs need HTTPS. `vite --host` only exposes HTTP, so it is not enough for realistic phone testing.

Use one of these:

- Deploy the built `dist/` folder to a static HTTPS host such as Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any equivalent static host.
- Use an HTTPS development tunnel such as ngrok, Cloudflare Tunnel, or Tailscale Funnel that forwards to your local Vite server.

Real-phone checklist:

1. Open Photon on both phones over HTTPS.
2. Add/install the PWA if you want to test offline launch behavior.
3. Load Photon once, then try airplane mode.
4. On one phone, tap Send a photo and choose a small photo.
5. On the other phone, tap Receive a photo and grant camera access.
6. Hold the receiver steady, fill the framing outline with the sender's QR, and turn up the sender's brightness.
7. Tune QR speed, fragment size, image edge, and quality if scanning stalls.

## iOS Notes

Source-confirmed caveats:

- `getUserMedia` requires a secure context: HTTPS or localhost. This is documented by MDN.
- iOS Safari supports camera access through `getUserMedia`, but Safari/iOS does not reliably provide the native `BarcodeDetector` path. Photon uses `qr-scanner`, which falls back to its bundled worker-based QR decoder.
- Installed iOS web apps can be stricter than regular Safari tabs. Test both Safari and Add to Home Screen before relying on Photon in the field.

Not yet claimed:

- This repository has not been verified on a physical iPhone from this Windows workspace. Treat iOS behavior as source-confirmed but device-unverified until you test it.

References:

- [MDN: MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Can I use: getUserMedia](https://caniuse.com/mdn-api_mediadevices_getusermedia)
- [Can I use: BarcodeDetector](https://caniuse.com/mdn-api_barcodedetector)
- [qr-scanner README](https://github.com/nimiq/qr-scanner)

## Project Structure

```text
src/App.tsx              Main send/receive UI
src/transfer/bcUr.ts     BC-UR encoder/decoder adapter
src/transfer/envelope.ts Binary Photon envelope
src/transfer/image.ts    Local canvas resize and JPEG compression
src/transfer/crypto.ts   SHA-256 hashing
src/transfer/qr.ts       QR canvas rendering
src/transfer/settings.ts Tunable transfer settings
```

## Current Limits

- One-way transfer only. The sender stops manually.
- No passphrase encryption yet.
- No cross-session resume.
- Large photos are slow. Start with small image sizes while tuning camera reliability.
