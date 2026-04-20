import { Eye, EyeOff, Plus, QrCode, Trash2, Type } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

import type { Selection } from "./editor-canvas";

function blockLabel(block: PrismaJson.TextBlock): string {
  const first = block.lines.find((l) => l.text?.trim());
  if (!first) return "(boş metin)";
  return first.text.length > 24 ? first.text.slice(0, 24) + "…" : first.text;
}

export function LayersPanel({
  layout,
  qrcode,
  selection,
  onSelect,
  onAddBlock,
  onAddQr,
  onDeleteBlock,
  onToggleQrVisibility,
  onReorder,
}: {
  layout: PrismaJson.TextBlock[];
  qrcode: PrismaJson.QRCode | null;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onAddBlock: () => void;
  onAddQr: () => void;
  onDeleteBlock: (id: string) => void;
  onToggleQrVisibility: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="justify-start gap-2"
          onClick={onAddBlock}
        >
          <Plus className="size-4" /> Metin bloğu
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start gap-2"
          onClick={onAddQr}
          disabled={!!qrcode}
        >
          <Plus className="size-4" /> QR kodu {qrcode ? " (zaten var)" : ""}
        </Button>
      </div>

      <div className="text-xs uppercase tracking-wider text-muted-foreground pt-2 px-1">
        Katmanlar
      </div>

      <div className="flex flex-col gap-1 overflow-auto">
        {layout.length === 0 && !qrcode && (
          <div className="text-xs text-muted-foreground italic px-2 py-4 border border-dashed rounded">
            Henüz katman yok. Bir metin bloğu ya da QR ekle.
          </div>
        )}

        {layout.map((block, index) => {
          const selected =
            selection?.kind === "block" && selection.id === block.id;
          return (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(index));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData("text/plain"));
                if (!Number.isNaN(from) && from !== index)
                  onReorder(from, index);
              }}
              onClick={() => onSelect({ kind: "block", id: block.id })}
              className={cn(
                "group flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-grab active:cursor-grabbing",
                selected
                  ? "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/40"
                  : "hover:bg-muted",
              )}
              title={`Blok · X:${block.x} Y:${block.y}`}
            >
              <Type className="size-4 shrink-0 text-slate-500" />
              <span className="truncate flex-1">{blockLabel(block)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBlock(block.id);
                    }}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Sil</TooltipContent>
              </Tooltip>
            </div>
          );
        })}

        {qrcode && (
          <div
            onClick={() => onSelect({ kind: "qr" })}
            className={cn(
              "group flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer",
              selection?.kind === "qr"
                ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/40"
                : "hover:bg-muted",
            )}
          >
            <QrCode className="size-4 shrink-0 text-emerald-600" />
            <span className="truncate flex-1">QR kodu</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleQrVisibility();
                  }}
                >
                  {qrcode.show ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <EyeOff className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {qrcode.show ? "Gizle" : "Göster"}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
