import QRCode from "qrcode";

export async function generateCertificateQrSvg(verificationUrl: string): Promise<string> {
  return QRCode.toString(verificationUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 148,
    color: {
      dark: "#111111",
      light: "#f4f3ef",
    },
  });
}

export async function generateCertificateQrDataUrl(verificationUrl: string): Promise<string> {
  return QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: {
      dark: "#111111",
      light: "#f4f3ef",
    },
  });
}
