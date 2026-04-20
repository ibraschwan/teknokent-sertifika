// Shared coordinate helpers for the template editor.
//
// The PDF layout stores positions in points with the Y axis growing UPWARD
// from the bottom-left corner (pdf-lib convention). The editor UI shows
// positions as top-origin (natural reading order) and drags happen in
// browser pixels. Everything in this file converts between those frames.

export const A4_LANDSCAPE_PT = { width: 841.89, height: 595.28 } as const;
export const A4_PORTRAIT_PT = { width: 595.28, height: 841.89 } as const;

// Client-safe default for a new QR code. Matches `sampleQR` in pdf.server.ts
// but lives here so the editor can reference it without pulling in the
// server bundle.
export const DEFAULT_QR: PrismaJson.QRCode = {
  show: false,
  x: 452,
  y: 752,
  width: 40,
  color: [0, 0, 0],
  background: [1, 1, 1],
  ec: "M",
};

export type PageSize = { width: number; height: number };

// PDF (bottom-origin, points) -> top-origin points
export function pdfYToTopY(
  pdfY: number,
  blockSize: number,
  page: PageSize,
): number {
  // block.y is the text baseline. The box we want to show starts at the top
  // of the glyphs, which is one `size` above the baseline.
  return Math.round(page.height - pdfY);
}

// top-origin points -> PDF (bottom-origin) points
export function topYToPdfY(topY: number, page: PageSize): number {
  return Math.round(page.height - topY);
}

export function scalePtToPx(pt: number, pxPerPt: number) {
  return pt * pxPerPt;
}

export function scalePxToPt(px: number, pxPerPt: number) {
  return pxPerPt === 0 ? 0 : px / pxPerPt;
}

// Project a block's baseline into the pixel rectangle that should appear
// on screen. The returned `top` is the visual top of the glyph box.
export function blockRectPx(
  block: { x: number; y: number; size: number; maxWidth?: number },
  page: PageSize,
  pxPerPtX: number,
  pxPerPtY: number,
): { left: number; top: number; height: number; minWidth: number } {
  const left = block.x * pxPerPtX;
  const height = Math.max(block.size * pxPerPtY, 14);
  // glyph box sits ABOVE the baseline
  const top = (page.height - block.y) * pxPerPtY - height;
  const minWidth = block.maxWidth ? block.maxWidth * pxPerPtX : 120;
  return { left, top, height, minWidth };
}

export function qrRectPx(
  qr: { x: number; y: number; width: number },
  page: PageSize,
  pxPerPtX: number,
  pxPerPtY: number,
): { left: number; top: number; width: number; height: number } {
  const widthPx = qr.width * pxPerPtX;
  const heightPx = qr.width * pxPerPtY;
  return {
    left: qr.x * pxPerPtX,
    top: (page.height - qr.y) * pxPerPtY - heightPx,
    width: widthPx,
    height: heightPx,
  };
}

export function clampToPage(
  pt: { x: number; y: number },
  page: PageSize,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(page.width, pt.x)),
    y: Math.max(0, Math.min(page.height, pt.y)),
  };
}
