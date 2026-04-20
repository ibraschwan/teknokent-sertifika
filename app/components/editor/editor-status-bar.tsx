import { Redo2, Undo2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import { pdfYToTopY, A4_LANDSCAPE_PT } from "~/lib/editor-coords";

import type { Selection } from "./editor-canvas";

export function EditorStatusBar({
  selection,
  layout,
  qrcode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  selection: Selection;
  layout: PrismaJson.TextBlock[];
  qrcode: PrismaJson.QRCode | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const page = A4_LANDSCAPE_PT;
  let label = "Hiçbir şey seçili değil";
  let coords = "";

  if (selection?.kind === "block") {
    const b = layout.find((x) => x.id === selection.id);
    if (b) {
      const topY = pdfYToTopY(b.y, b.size, page) - b.size;
      label = `Metin bloğu "${b.lines.map((l) => l.text).join(" · ") || "(boş)"}"`;
      coords = `X ${b.x}pt · Üst ${topY}pt · ${b.size}pt`;
    }
  } else if (selection?.kind === "qr" && qrcode) {
    const topY = Math.round(page.height - qrcode.y);
    label = `QR kodu`;
    coords = `X ${qrcode.x}pt · Üst ${topY}pt · ${qrcode.width}pt`;
  }

  return (
    <div className="flex items-center gap-3 border-t bg-muted/30 px-3 py-1.5 text-xs">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={!canUndo}
          onClick={onUndo}
          title="Geri al (⌘Z)"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={!canRedo}
          onClick={onRedo}
          title="Yinele (⌘⇧Z)"
        >
          <Redo2 className="size-4" />
        </Button>
      </div>
      <span className="truncate text-muted-foreground flex-1">
        {label}
      </span>
      <span className="tabular-nums font-mono text-muted-foreground">
        {coords}
      </span>
    </div>
  );
}
