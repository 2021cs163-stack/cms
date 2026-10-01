import { afterEach, expect, it, vi } from "vitest";
import { downloadCertificatePdf } from "../src/certificate-pdf";

const mocks = vi.hoisted(() => ({
  toPng: vi.fn(),
  addImage: vi.fn(),
  save: vi.fn(),
  options: vi.fn(),
}));
vi.mock("html-to-image", () => ({ toPng: mocks.toPng }));
vi.mock("jspdf", () => ({
  jsPDF: class {
    constructor(options: unknown) {
      mocks.options(options);
    }
    addImage = mocks.addImage;
    save = mocks.save;
  },
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("waits for fonts and downloads the entire certificate on one proportional page", async () => {
  let ready!: () => void;
  vi.stubGlobal("document", {
    fonts: {
      ready: new Promise<void>((resolve) => {
        ready = resolve;
      }),
    },
  });
  mocks.toPng.mockResolvedValue("data:image/png;base64,certificate");
  const element = {
    offsetWidth: 1000,
    offsetHeight: 1200,
    clientHeight: 400,
  } as HTMLElement;
  const download = downloadCertificatePdf(element, "AZ/2026:001");
  expect(mocks.toPng).not.toHaveBeenCalled();
  ready();
  await download;
  expect(mocks.toPng).toHaveBeenCalledWith(
    element,
    expect.objectContaining({ width: 1000, height: 1200, pixelRatio: 2 }),
  );
  expect(mocks.options).toHaveBeenCalledWith(
    expect.objectContaining({ format: [750, 900], orientation: "portrait" }),
  );
  expect(mocks.addImage).toHaveBeenCalledWith(
    "data:image/png;base64,certificate",
    "PNG",
    0,
    0,
    750,
    900,
  );
  expect(mocks.save).toHaveBeenCalledWith("AZ-2026-001.pdf", {
    returnPromise: true,
  });
});

it("does not download an empty PDF when capture fails", async () => {
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() } });
  mocks.toPng.mockRejectedValue(new Error("Capture failed"));
  await expect(
    downloadCertificatePdf(
      { offsetWidth: 1000, offsetHeight: 700 } as HTMLElement,
      "AZ-1",
    ),
  ).rejects.toThrow("Capture failed");
  expect(mocks.save).not.toHaveBeenCalled();
});
