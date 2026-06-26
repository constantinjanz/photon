# Photon Agent Notes

## Commands

- Install dependencies on Windows PowerShell with `npm.cmd install`.
- Start dev server: `npm.cmd run dev`.
- Type-check: `npm.cmd run typecheck`.
- Run tests: `npm.cmd test`.
- Production build: `npm.cmd run build`.

## Project Rules

- Photon must not load third-party runtime scripts, fonts, analytics, telemetry, or CDN assets.
- Transfers must stay local: photo bytes are compressed, encoded, scanned, decoded, and verified entirely in the browser.
- Keep the README honest about privacy boundaries: first page load reaches the host, QR screens are visible to bystanders, and the received copy lives on the receiver's device.
- Prefer beginner-friendly TypeScript with short comments around the transfer pipeline.
