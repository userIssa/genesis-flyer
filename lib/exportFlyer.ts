import html2canvas from "html2canvas";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import JSZip from "jszip";

export type ExportProgress = {
  current: number;
  total: number;
  stage: string;
};

/**
 * Pre-warms and ensures all images and fonts in the DOM node are loaded and decoded.
 */
async function waitForAssets(element: HTMLElement): Promise<void> {
  // Wait for document fonts if supported
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Font loading failure shouldn't block export
    }
  }

  // Wait for all <img> tags in the element
  const imgs = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth !== 0) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 3500); // 3.5s safety timeout
      });
    })
  );

  // Short pause to ensure layout paint has stabilized
  await new Promise((r) => setTimeout(r, 100));
}

/**
 * Renders an array of .flyer-page HTML elements to high-resolution JPEG Data URLs.
 * Uses html2canvas as the primary engine (100% reliable across Safari, Chrome, iOS)
 * with a fallback to html-to-image if needed.
 */
export async function renderPagesToJpeg(
  pageElements: HTMLElement[],
  onProgress?: (progress: ExportProgress) => void
): Promise<string[]> {
  const dataUrls: string[] = [];
  const total = pageElements.length;

  for (let i = 0; i < total; i++) {
    const el = pageElements[i];
    const pageName = i === 0 ? "Cover Page" : `Grid Page ${i}`;

    onProgress?.({
      current: i + 1,
      total,
      stage: `Rendering ${pageName} (${i + 1}/${total})…`,
    });

    // Make sure all assets inside this page are loaded
    await waitForAssets(el);

    let dataUrl: string | null = null;

    // Primary: html2canvas (native 2D canvas drawing, full Safari & WebKit support)
    try {
      const canvas = await html2canvas(el, {
        scale: 1.5, // 1950x1395 crisp resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FAF6F0",
        width: 1300,
        height: 930,
        windowWidth: 1300,
        windowHeight: 930,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        logging: false,
        imageTimeout: 10000,
        onclone: (_clonedDoc, clonedEl) => {
          // html2canvas does not natively implement CSS object-fit: cover, which causes
          // images inside fixed width/height containers to be stretched/squashed to the box.
          // We calculate the exact cover geometry and apply it directly to the cloned element.
          const imgs = clonedEl.querySelectorAll<HTMLImageElement>("img");
          imgs.forEach((img) => {
            let nw = img.naturalWidth;
            let nh = img.naturalHeight;
            if (!nw || !nh) {
              const originalImg = el.querySelector<HTMLImageElement>(
                `img[src="${img.getAttribute("src")}"]`
              );
              if (originalImg && originalImg.naturalWidth && originalImg.naturalHeight) {
                nw = originalImg.naturalWidth;
                nh = originalImg.naturalHeight;
              }
            }

            const parent = img.parentElement;
            if (parent && nw && nh) {
              const isCover =
                img.classList.contains("object-cover") ||
                window.getComputedStyle(img).objectFit === "cover";

              if (isCover) {
                const bw = parent.clientWidth || 184;
                const bh = parent.clientHeight || 208;
                const imgRatio = nw / nh;
                const boxRatio = bw / bh;

                img.style.position = "absolute";
                img.style.maxWidth = "none";
                img.style.maxHeight = "none";

                if (imgRatio > boxRatio) {
                  // Image is wider than container (landscape) -> lock height, scale width, center horizontally
                  const rw = bh * imgRatio;
                  img.style.height = `${bh}px`;
                  img.style.width = `${rw}px`;
                  img.style.top = "0px";
                  img.style.left = `${(bw - rw) / 2}px`;
                } else {
                  // Image is taller than container (portrait) -> lock width, scale height, center vertically
                  const rh = bw / imgRatio;
                  img.style.width = `${bw}px`;
                  img.style.height = `${rh}px`;
                  img.style.left = "0px";
                  img.style.top = `${(bh - rh) / 2}px`;
                }
              }
            }
          });
        },
      });
      dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    } catch (canvasErr) {
      console.warn("html2canvas render failed, trying html-to-image fallback:", canvasErr);
    }

    // Fallback: html-to-image
    if (!dataUrl) {
      dataUrl = await toJpeg(el, {
        quality: 0.95,
        pixelRatio: 1.5,
        width: 1300,
        height: 930,
        backgroundColor: "#FAF6F0",
        cacheBust: true,
        skipFonts: true,
      });
    }

    dataUrls.push(dataUrl);
  }

  return dataUrls;
}

/**
 * Generates and directly downloads a multi-page PDF of the flyer pages.
 */
export async function downloadFlyerAsPdf(
  pageElements: HTMLElement[],
  filename: string,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  const dataUrls = await renderPagesToJpeg(pageElements, onProgress);

  onProgress?.({
    current: dataUrls.length,
    total: dataUrls.length,
    stage: "Assembling PDF document…",
  });

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [1300, 930],
    hotfixes: ["px_scaling"],
  });

  dataUrls.forEach((dataUrl, i) => {
    if (i > 0) {
      pdf.addPage([1300, 930], "landscape");
    }
    pdf.addImage(dataUrl, "JPEG", 0, 0, 1300, 930, undefined, "FAST");
  });

  onProgress?.({
    current: dataUrls.length,
    total: dataUrls.length,
    stage: "Starting download…",
  });

  const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, "_") || "flyer";
  pdf.save(`${safeFilename}.pdf`);
}

/**
 * Generates and downloads a ZIP file containing high-resolution JPEG images of each page.
 */
export async function downloadFlyerAsJpegZip(
  pageElements: HTMLElement[],
  filename: string,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  const dataUrls = await renderPagesToJpeg(pageElements, onProgress);

  onProgress?.({
    current: dataUrls.length,
    total: dataUrls.length,
    stage: "Packaging JPEG images into ZIP…",
  });

  const zip = new JSZip();
  const folderName = filename.replace(/[^a-zA-Z0-9_-]/g, "_") || "flyer";
  const folder = zip.folder(folderName) ?? zip;

  dataUrls.forEach((dataUrl, i) => {
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    const pageNumber = String(i + 1).padStart(2, "0");
    const name = i === 0 ? `${pageNumber}_Cover_Page.jpg` : `${pageNumber}_Celebrants_Grid_${i}.jpg`;
    folder.file(name, base64, { base64: true });
  });

  onProgress?.({
    current: dataUrls.length,
    total: dataUrls.length,
    stage: "Compressing ZIP file…",
  });

  const content = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.({
        current: Math.round(metadata.percent),
        total: 100,
        stage: `Compressing ZIP (${Math.round(metadata.percent)}%)…`,
      });
    }
  );

  onProgress?.({
    current: 100,
    total: 100,
    stage: "Starting download…",
  });

  const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, "_") || "flyer";
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename}-JPEGs.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
