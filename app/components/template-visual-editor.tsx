import { useCallback, useEffect, useRef, useState } from "react";
import { Move, QrCode, Type } from "lucide-react";

import { cn } from "~/lib/utils";

// Page size in PDF points. A4 landscape by default; keep matching the
// blank-template generator (generateBlankTemplatePDF in pdf.server.ts).
const DEFAULT_PAGE_WIDTH_PT = 841.89;
const DEFAULT_PAGE_HEIGHT_PT = 595.28;

type DragState = {
  kind: "block" | "qr";
  id: string;
  startPointerX: number;
  startPointerY: number;
  startX: number;
  startY: number;
  pointerId: number;
};

export function VisualLayoutEditor({
  layout,
  qrcode,
  onLayoutChange,
  onQrcodeChange,
  onSelectBlock,
  selectedBlockId,
  previewUrl,
  previewKey,
  pageWidthPt = DEFAULT_PAGE_WIDTH_PT,
  pageHeightPt = DEFAULT_PAGE_HEIGHT_PT,
}: {
  layout: PrismaJson.TextBlock[];
  qrcode: PrismaJson.QRCode | null;
  onLayoutChange: (layout: PrismaJson.TextBlock[]) => void;
  onQrcodeChange: (qr: PrismaJson.QRCode) => void;
  onSelectBlock?: (id: string | null) => void;
  selectedBlockId?: string | null;
  previewUrl: string;
  previewKey?: string | number;
  pageWidthPt?: number;
  pageHeightPt?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<DragState | null>(null);

  // Track container pixel dimensions so we can map points <-> pixels.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scaleX = containerSize.w / pageWidthPt;
  const scaleY = containerSize.h / pageHeightPt;
  const ready = containerSize.w > 0;

  // PDF points → pixels. Y origin flips from bottom to top.
  const pxX = (xPt: number) => xPt * scaleX;
  const pxYFromPdfY = (yPt: number) => (pageHeightPt - yPt) * scaleY;

  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      kind: "block" | "qr",
      id: string,
      startX: number,
      startY: number,
    ) => {
      if (!containerRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      setDrag({
        kind,
        id,
        pointerId: e.pointerId,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startX,
        startY,
      });
      if (kind === "block") onSelectBlock?.(id);
    },
    [onSelectBlock],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dxPx = e.clientX - drag.startPointerX;
      const dyPx = e.clientY - drag.startPointerY;
      const dxPt = dxPx / scaleX;
      // Screen Y-down, PDF Y-up: flip sign
      const dyPt = -dyPx / scaleY;
      const nextX = Math.round(drag.startX + dxPt);
      const nextY = Math.round(drag.startY + dyPt);

      if (drag.kind === "block") {
        onLayoutChange(
          layout.map((b) =>
            b.id === drag.id ? { ...b, x: nextX, y: nextY } : b,
          ),
        );
      } else if (drag.kind === "qr" && qrcode) {
        onQrcodeChange({ ...qrcode, x: nextX, y: nextY });
      }
    },
    [drag, layout, qrcode, onLayoutChange, onQrcodeChange, scaleX, scaleY],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (drag && e.pointerId === drag.pointerId) setDrag(null);
    },
    [drag],
  );

  const blockText = (block: PrismaJson.TextBlock) =>
    block.lines
      .map((seg) => seg.text)
      .filter(Boolean)
      .join(" · ") || "(boş metin)";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Move className="size-3.5" /> Öğeleri önizleme üzerinde sürükleyerek
          konumlandır
        </span>
        <span className="tabular-nums">
          {Math.round(pageWidthPt)} × {Math.round(pageHeightPt)} pt
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative self-center w-full max-w-full drop-shadow-xl select-none"
        style={{ aspectRatio: `${pageWidthPt} / ${pageHeightPt}` }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => onSelectBlock?.(null)}
      >
        <img
          src={previewUrl}
          alt="Şablon önizlemesi"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          key={previewKey}
        />

        {ready &&
          layout.map((block) => {
            const selected = block.id === selectedBlockId;
            const left = pxX(block.x);
            // Anchor overlay box at the text baseline: draw the box ABOVE (y-block-size) to y.
            const boxHeight = Math.max(
              block.size * scaleY,
              14,
            );
            const top = pxYFromPdfY(block.y) - boxHeight;
            const width = block.maxWidth
              ? pxX(block.maxWidth)
              : Math.max(120, blockText(block).length * block.size * 0.5 * scaleX);
            const align = block.align ?? "left";

            return (
              <div
                key={block.id}
                onPointerDown={(e) =>
                  onPointerDown(e, "block", block.id, block.x, block.y)
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBlock?.(block.id);
                }}
                className={cn(
                  "absolute flex items-center px-1 rounded-sm cursor-move border text-black",
                  selected
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500"
                    : "border-dashed border-slate-400/60 hover:border-blue-500 hover:bg-blue-500/5",
                )}
                style={{
                  left,
                  top,
                  width,
                  minHeight: boxHeight,
                  fontSize: Math.max(block.size * scaleY, 8),
                  lineHeight: 1.1,
                  textAlign: align,
                  justifyContent:
                    align === "center"
                      ? "center"
                      : align === "right"
                        ? "flex-end"
                        : "flex-start",
                  color: block.color
                    ? `rgb(${Math.round(block.color[0] * 255)},${Math.round(block.color[1] * 255)},${Math.round(block.color[2] * 255)})`
                    : undefined,
                }}
                title={`X: ${block.x}, Y: ${block.y}, ${block.size}pt`}
              >
                <Type className="size-3 mr-1 text-slate-500 shrink-0" />
                <span className="truncate">{blockText(block)}</span>
              </div>
            );
          })}

        {ready && qrcode?.show && (
          <div
            onPointerDown={(e) =>
              onPointerDown(e, "qr", "qr", qrcode.x, qrcode.y)
            }
            className="absolute flex items-center justify-center rounded-sm border-2 border-dashed border-emerald-500/70 bg-emerald-500/10 cursor-move hover:bg-emerald-500/20"
            style={{
              left: pxX(qrcode.x),
              top: pxYFromPdfY(qrcode.y) - qrcode.width * scaleY,
              width: qrcode.width * scaleX,
              height: qrcode.width * scaleY,
            }}
            title={`QR · X: ${qrcode.x}, Y: ${qrcode.y}, ${qrcode.width}pt`}
          >
            <QrCode className="size-1/2 text-emerald-700 opacity-70" />
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground italic">
        Canlı önizleme için{" "}
        <span className="font-semibold">Kaydet ve Önizle</span>{" "}
        düğmesine bas. Sürükleme yalnızca konumu değiştirir; kayıt sırasında
        gerçek PDF önizlemesi üretilir.
      </div>
    </div>
  );
}
