import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export async function downloadCertificatePdf(
  element: HTMLElement,
  number: string,
) {
  await document.fonts.ready;
  // Capture the full certificate node, including content outside the modal viewport.
  // Browser rendering preserves the displayed fonts, RTL shaping, colors and QR code.
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  if (!width || !height) throw new Error("Certificate is not visible");
  const image = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    width,
    height,
    style: { margin: "0" },
  });
  const pdf = new jsPDF({
    orientation: width > height ? "landscape" : "portrait",
    unit: "pt",
    format: [width * 0.75, height * 0.75],
    compress: true,
  });
  pdf.addImage(image, "PNG", 0, 0, width * 0.75, height * 0.75);
  const filename = String(number || "certificate").replace(
    /[<>:"/\\|?*\x00-\x1f]/g,
    "-",
  );
  await pdf.save(`${filename}.pdf`, { returnPromise: true });
}
