import QRCode from "qrcode";

export async function drawQrFrame(canvas: HTMLCanvasElement, value: string): Promise<void> {
  await QRCode.toCanvas(canvas, value, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 900,
    color: {
      dark: "#101820",
      light: "#ffffff"
    }
  });
}
