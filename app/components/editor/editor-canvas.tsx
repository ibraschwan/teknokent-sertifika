import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QrCode, Type } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  A4_LANDSCAPE_PT,
  blockRectPx,
  qrRectPx,
  type PageSize,
} from "~/lib/editor-coords";
import { SnapGuides, type SnapGuide } from "./editor-snap-guides";

export type Selection =
  | { kind: "block"; id: string }
  | { kind: "qr" }
  | null;

type DragState = {
  kind: "block-move" | "block-resize" | "qr-move" | "qr-resize";
  targetId: string | "qr";
  pointerId: number;
  startX: number; // pointer px
  startY: number; // pointer px
  original: {
    x: number;
    y: number;
    maxWidth?: number;
    width?: number;
  };
};

const SNAP_PX = 4;
const MARGIN_PT = 24;

type CanvasProps = {
  layout: PrismaJson.TextBlock[];
  qrcode: PrismaJson.QRCode | null;
  previewUrl: string;
  previewKey?: string | number;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onLayoutLive: (layout: PrismaJson.TextBlock[]) => void;
  onQrcodeLive: (qr: PrismaJson.QRCode) => void;
  onCommit: () => void;
  onInlineEditText: (blockId: string, text: string) => void;
  pageSize?: PageSize;
  zoom?: number; // 1 = fit
};

export function EditorCanvas(props: CanvasProps) {
  const {
    layout,
    qrcode,
    previewUrl,
    previewKey,
    selection,
    onSelect,
    onLayoutLive,
    onQrcodeLive,
    onCommit,
    onInlineEditText,
    pageSize = A4_LANDSCAPE_PT,
    zoom = 1,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  // Track actual rendered size of the canvas in pixels
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

  const pxPerPtX = containerSize.w / pageSize.width;
  const pxPerPtY = containerSize.h / pageSize.height;
  const ready = containerSize.w > 0;

  const snapCandidates = useMemo(() => {
    const xs: number[] = [
      0,
      pageSize.width / 2,
      pageSize.width,
      MARGIN_PT,
      pageSize.width - MARGIN_PT,
    ];
    const ys: number[] = [
      0,
      pageSize.height / 2,
      pageSize.height,
      MARGIN_PT,
      pageSize.height - MARGIN_PT,
    ];
    for (const b of layout) {
      xs.push(b.x);
      ys.push(b.y);
      if (b.maxWidth) xs.push(b.x + b.maxWidth);
    }
    if (qrcode?.show) {
      xs.push(qrcode.x);
      ys.push(qrcode.y);
      xs.push(qrcode.x + qrcode.width);
    }
    return { xs, ys };
  }, [layout, qrcode, pageSize]);

  const snapToCandidates = useCallback(
    (
      xPt: number,
      yPt: number,
      excludeTargetId: string | null,
    ): { x: number; y: number; guides: SnapGuide[] } => {
      const snapPtX = SNAP_PX / pxPerPtX;
      const snapPtY = SNAP_PX / pxPerPtY;
      let snappedX = xPt;
      let snappedY = yPt;
      const emitted: SnapGuide[] = [];
      // Build exclusion list of candidate coordinates that belong to the
      // dragging element itself — otherwise it snaps to its own edges.
      const selfX = new Set<number>();
      const selfY = new Set<number>();
      if (excludeTargetId === "qr" && qrcode) {
        selfX.add(qrcode.x);
        selfX.add(qrcode.x + qrcode.width);
        selfY.add(qrcode.y);
      } else if (excludeTargetId) {
        const b = layout.find((x) => x.id === excludeTargetId);
        if (b) {
          selfX.add(b.x);
          selfY.add(b.y);
          if (b.maxWidth) selfX.add(b.x + b.maxWidth);
        }
      }
      let bestX = Infinity;
      let bestY = Infinity;
      for (const cx of snapCandidates.xs) {
        if (selfX.has(cx)) continue;
        const d = Math.abs(cx - xPt);
        if (d < snapPtX && d < bestX) {
          bestX = d;
          snappedX = cx;
        }
      }
      for (const cy of snapCandidates.ys) {
        if (selfY.has(cy)) continue;
        const d = Math.abs(cy - yPt);
        if (d < snapPtY && d < bestY) {
          bestY = d;
          snappedY = cy;
        }
      }
      if (bestX !== Infinity) emitted.push({ axis: "x", pt: snappedX });
      if (bestY !== Infinity) emitted.push({ axis: "y", pt: snappedY });
      return { x: snappedX, y: snappedY, guides: emitted };
    },
    [snapCandidates, layout, qrcode, pxPerPtX, pxPerPtY],
  );

  const startDrag = useCallback(
    (
      e: React.PointerEvent,
      state: Omit<DragState, "pointerId" | "startX" | "startY">,
    ) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      setDrag({
        ...state,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      });
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dxPt = (e.clientX - drag.startX) / pxPerPtX;
      const dyPt = -(e.clientY - drag.startY) / pxPerPtY; // screen Y flipped

      if (drag.kind === "block-move") {
        const block = layout.find((b) => b.id === drag.targetId);
        if (!block) return;
        const targetX = drag.original.x + dxPt;
        const targetY = drag.original.y + dyPt;
        const { x, y, guides: g } = snapToCandidates(
          targetX,
          targetY,
          drag.targetId,
        );
        setGuides(g);
        onLayoutLive(
          layout.map((b) =>
            b.id === drag.targetId
              ? { ...b, x: Math.round(x), y: Math.round(y) }
              : b,
          ),
        );
      } else if (drag.kind === "block-resize") {
        const originalWidth = drag.original.maxWidth ?? pageSize.width;
        const next = Math.max(16, Math.round(originalWidth + dxPt));
        onLayoutLive(
          layout.map((b) =>
            b.id === drag.targetId ? { ...b, maxWidth: next } : b,
          ),
        );
      } else if (drag.kind === "qr-move" && qrcode) {
        const targetX = drag.original.x + dxPt;
        const targetY = drag.original.y + dyPt;
        const { x, y, guides: g } = snapToCandidates(targetX, targetY, "qr");
        setGuides(g);
        onQrcodeLive({ ...qrcode, x: Math.round(x), y: Math.round(y) });
      } else if (drag.kind === "qr-resize" && qrcode) {
        const originalWidth = drag.original.width ?? qrcode.width;
        const next = Math.max(20, Math.round(originalWidth + dxPt));
        onQrcodeLive({ ...qrcode, width: next });
      }
    },
    [drag, layout, qrcode, onLayoutLive, onQrcodeLive, snapToCandidates, pxPerPtX, pxPerPtY, pageSize],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      setDrag(null);
      setGuides([]);
      onCommit();
    },
    [drag, onCommit],
  );

  // Keyboard nudging
  useEffect(() => {
    if (!selection) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      const delta = e.shiftKey ? 10 : 1;
      let handled = false;
      if (selection.kind === "block") {
        const block = layout.find((b) => b.id === selection.id);
        if (!block) return;
        if (e.key === "ArrowLeft") {
          onLayoutLive(
            layout.map((b) =>
              b.id === selection.id ? { ...b, x: Math.max(0, b.x - delta) } : b,
            ),
          );
          handled = true;
        } else if (e.key === "ArrowRight") {
          onLayoutLive(
            layout.map((b) =>
              b.id === selection.id
                ? { ...b, x: Math.min(pageSize.width, b.x + delta) }
                : b,
            ),
          );
          handled = true;
        } else if (e.key === "ArrowUp") {
          onLayoutLive(
            layout.map((b) =>
              b.id === selection.id
                ? { ...b, y: Math.min(pageSize.height, b.y + delta) }
                : b,
            ),
          );
          handled = true;
        } else if (e.key === "ArrowDown") {
          onLayoutLive(
            layout.map((b) =>
              b.id === selection.id ? { ...b, y: Math.max(0, b.y - delta) } : b,
            ),
          );
          handled = true;
        } else if (e.key === "Enter") {
          setEditingId(selection.id);
          handled = true;
        }
      } else if (selection.kind === "qr" && qrcode) {
        if (e.key === "ArrowLeft") {
          onQrcodeLive({ ...qrcode, x: Math.max(0, qrcode.x - delta) });
          handled = true;
        } else if (e.key === "ArrowRight") {
          onQrcodeLive({
            ...qrcode,
            x: Math.min(pageSize.width, qrcode.x + delta),
          });
          handled = true;
        } else if (e.key === "ArrowUp") {
          onQrcodeLive({
            ...qrcode,
            y: Math.min(pageSize.height, qrcode.y + delta),
          });
          handled = true;
        } else if (e.key === "ArrowDown") {
          onQrcodeLive({ ...qrcode, y: Math.max(0, qrcode.y - delta) });
          handled = true;
        }
      }
      if (handled) {
        e.preventDefault();
        onCommit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selection, layout, qrcode, onLayoutLive, onQrcodeLive, onCommit, pageSize]);

  const blockText = (block: PrismaJson.TextBlock) =>
    block.lines
      .map((seg) => seg.text)
      .filter(Boolean)
      .join(" · ") || "(boş metin)";

  return (
    <div className="flex flex-col gap-2 h-full">
      <div
        ref={containerRef}
        className="relative self-center w-full max-w-full drop-shadow-xl select-none bg-white"
        style={{
          aspectRatio: `${pageSize.width} / ${pageSize.height}`,
          transform: zoom !== 1 ? `scale(${zoom})` : undefined,
          transformOrigin: "top center",
        }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelect(null);
        }}
      >
        <img
          src={previewUrl}
          alt="Şablon önizlemesi"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          key={previewKey}
          draggable={false}
        />

        {ready &&
          layout.map((block) => {
            const selected =
              selection?.kind === "block" && selection.id === block.id;
            const rect = blockRectPx(block, pageSize, pxPerPtX, pxPerPtY);
            const width = block.maxWidth
              ? block.maxWidth * pxPerPtX
              : Math.max(
                  rect.minWidth,
                  blockText(block).length * block.size * 0.5 * pxPerPtX,
                );
            const align = block.align ?? "left";
            const isEditing = editingId === block.id;

            return (
              <div
                key={block.id}
                onPointerDown={(e) => {
                  if (isEditing) return;
                  onSelect({ kind: "block", id: block.id });
                  startDrag(e, {
                    kind: "block-move",
                    targetId: block.id,
                    original: {
                      x: block.x,
                      y: block.y,
                      maxWidth: block.maxWidth,
                    },
                  });
                }}
                onDoubleClick={() => setEditingId(block.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ kind: "block", id: block.id });
                }}
                className={cn(
                  "absolute flex items-center pl-1 pr-2 rounded-sm cursor-move border text-black group",
                  selected
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500"
                    : "border-dashed border-slate-400/60 hover:border-blue-500 hover:bg-blue-500/5",
                  isEditing && "cursor-text",
                )}
                style={{
                  left: rect.left,
                  top: rect.top,
                  width,
                  minHeight: rect.height,
                  fontSize: Math.max(block.size * pxPerPtY, 8),
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
                {!isEditing && (
                  <Type className="size-3 mr-1 text-slate-500 shrink-0 opacity-60" />
                )}
                {isEditing ? (
                  <input
                    autoFocus
                    className="bg-transparent outline-none w-full text-black"
                    style={{ fontSize: "inherit", textAlign: align }}
                    defaultValue={block.lines[0]?.text ?? ""}
                    onBlur={(e) => {
                      onInlineEditText(block.id, e.target.value);
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        (e.target as HTMLInputElement).blur();
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate">{blockText(block)}</span>
                )}

                {selected && !isEditing && (
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      startDrag(e, {
                        kind: "block-resize",
                        targetId: block.id,
                        original: { x: block.x, y: block.y, maxWidth: block.maxWidth },
                      });
                    }}
                    className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize bg-blue-500 rounded-r-sm hover:w-2 transition-[width]"
                    title="Genişliği ayarla"
                  />
                )}
              </div>
            );
          })}

        {ready && qrcode?.show && (
          <div
            onPointerDown={(e) => {
              onSelect({ kind: "qr" });
              startDrag(e, {
                kind: "qr-move",
                targetId: "qr",
                original: { x: qrcode.x, y: qrcode.y, width: qrcode.width },
              });
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect({ kind: "qr" });
            }}
            className={cn(
              "absolute flex items-center justify-center rounded-sm border-2 border-dashed bg-emerald-500/10 cursor-move",
              selection?.kind === "qr"
                ? "border-emerald-500 ring-2 ring-emerald-500"
                : "border-emerald-500/70 hover:bg-emerald-500/20",
            )}
            style={qrRectPx(qrcode, pageSize, pxPerPtX, pxPerPtY)}
            title={`QR · X: ${qrcode.x}, Y: ${qrcode.y}, ${qrcode.width}pt`}
          >
            <QrCode className="size-1/2 text-emerald-700 opacity-70" />
            {selection?.kind === "qr" && (
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  startDrag(e, {
                    kind: "qr-resize",
                    targetId: "qr",
                    original: { x: qrcode.x, y: qrcode.y, width: qrcode.width },
                  });
                }}
                className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize bg-emerald-500 rounded-r-sm hover:w-2 transition-[width]"
                title="Boyutu ayarla"
              />
            )}
          </div>
        )}

        {ready && (
          <SnapGuides
            guides={guides}
            pxPerPtX={pxPerPtX}
            pxPerPtY={pxPerPtY}
            pageWidthPt={pageSize.width}
            pageHeightPt={pageSize.height}
          />
        )}
      </div>
    </div>
  );
}
