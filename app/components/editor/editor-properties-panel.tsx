import { useId } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";

import type { Typeface } from "~/generated/prisma/client";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

import { topYToPdfY, pdfYToTopY, A4_LANDSCAPE_PT } from "~/lib/editor-coords";
import { hexToRgbArray, rgbToHex, generateRandomId } from "~/lib/utils";

import type { Selection } from "./editor-canvas";
import { VariablePicker } from "./editor-variable-picker";

type Props = {
  selection: Selection;
  layout: PrismaJson.TextBlock[];
  qrcode: PrismaJson.QRCode | null;
  typefaces: Typeface[];
  onLayoutChange: (layout: PrismaJson.TextBlock[]) => void;
  onQrcodeChange: (qr: PrismaJson.QRCode) => void;
  onDeleteBlock: (id: string) => void;
  onDeleteQr: () => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  locale: string;
  onLocaleChange: (locale: string) => void;
  locales: { code: string; label: string }[];
};

export function PropertiesPanel(props: Props) {
  const sel = props.selection;
  if (sel?.kind === "block") {
    const block = props.layout.find((b) => b.id === sel.id);
    if (block) return <BlockProperties {...props} block={block} />;
  }
  if (sel?.kind === "qr" && props.qrcode) {
    return <QrProperties {...props} qr={props.qrcode} />;
  }
  return <TemplateProperties {...props} />;
}

// ---------------- Template (no selection) ----------------

function TemplateProperties({
  templateName,
  onTemplateNameChange,
  locale,
  onLocaleChange,
  locales,
}: Props) {
  const id = useId();
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>Şablon adı</Label>
        <Input
          id={`${id}-name`}
          value={templateName}
          onChange={(e) => onTemplateNameChange(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-locale`}>Tarih biçimi</Label>
        <Select value={locale} onValueChange={onLocaleChange}>
          <SelectTrigger id={`${id}-locale`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locales.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
        <div className="font-semibold mb-1">Sayfa boyutu</div>
        <div className="text-muted-foreground">A4 · yatay</div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
        <div className="font-semibold mb-1">Kısayollar</div>
        <ul className="text-muted-foreground space-y-0.5">
          <li>⌘Z / Ctrl+Z → geri al</li>
          <li>Ok tuşları → seçili öğeyi 1pt kaydır (⇧ ile 10pt)</li>
          <li>Çift tıkla → metni hızla düzenle</li>
        </ul>
      </div>
    </section>
  );
}

// ---------------- Text block ----------------

function BlockProperties({
  block,
  layout,
  typefaces,
  onLayoutChange,
  onDeleteBlock,
}: Props & { block: PrismaJson.TextBlock }) {
  const id = useId();
  const page = A4_LANDSCAPE_PT;
  const topY = pdfYToTopY(block.y, block.size, page) - block.size;

  const update = (patch: Partial<PrismaJson.TextBlock>) => {
    onLayoutChange(
      layout.map((b) => (b.id === block.id ? { ...b, ...patch } : b)),
    );
  };

  const updateSegment = (
    segmentId: string,
    patch: Partial<PrismaJson.TextSegment>,
  ) => {
    update({
      lines: block.lines.map((l) =>
        l.id === segmentId ? { ...l, ...patch } : l,
      ),
    });
  };

  const addSegment = () => {
    update({
      lines: [
        ...block.lines,
        { id: generateRandomId(), font: typefaces[0]?.name ?? "", text: "" },
      ],
    });
  };

  const reorderSegment = (index: number, delta: -1 | 1) => {
    const next = [...block.lines];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update({ lines: next });
  };

  const deleteSegment = (segmentId: string) => {
    if (block.lines.length <= 1) return;
    update({ lines: block.lines.filter((l) => l.id !== segmentId) });
  };

  const color = rgbToHex(block.color || [0, 0, 0]);

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="text-sm font-semibold">Metin bloğu</div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => onDeleteBlock(block.id)}
        >
          <Trash2 className="size-3.5 mr-1" /> Sil
        </Button>
      </header>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-x`} className="text-xs">X (soldan)</Label>
          <Input
            id={`${id}-x`}
            type="number"
            inputMode="numeric"
            value={block.x}
            onChange={(e) => update({ x: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-top`} className="text-xs">Üst (yukarıdan)</Label>
          <Input
            id={`${id}-top`}
            type="number"
            inputMode="numeric"
            value={topY}
            onChange={(e) => {
              const newTop = Number(e.target.value) || 0;
              update({ y: topYToPdfY(newTop + block.size, page) });
            }}
          />
        </div>
      </div>

      {/* Size + max width */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Yazı boyutu: {block.size}pt</Label>
          <Slider
            value={[block.size]}
            min={6}
            max={96}
            step={1}
            onValueChange={([v]) => update({ size: v })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-mw`} className="text-xs">Genişlik (pt)</Label>
          <Input
            id={`${id}-mw`}
            type="number"
            inputMode="numeric"
            placeholder="Sayfa genişliği"
            value={block.maxWidth ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              update({ maxWidth: v === "" ? undefined : Number(v) });
            }}
          />
        </div>
      </div>

      {/* Line height */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">
          Satır yüksekliği:{" "}
          <span className="tabular-nums">
            {block.lineHeight ? `${block.lineHeight}pt` : "otomatik"}
          </span>
        </Label>
        <Slider
          value={[block.lineHeight ?? Math.round(block.size * 1.4)]}
          min={Math.max(6, Math.round(block.size * 0.8))}
          max={Math.round(block.size * 2.5)}
          step={1}
          onValueChange={([v]) => update({ lineHeight: v })}
        />
      </div>

      {/* Color + alignment */}
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Renk</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start gap-2 h-9">
                <span
                  className="inline-block size-4 rounded border"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-xs">{color.toUpperCase()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <HexColorPicker
                color={color}
                onChange={(hex) => update({ color: hexToRgbArray(hex) })}
              />
              <Input
                className="mt-2 font-mono"
                value={color}
                onChange={(e) => {
                  const hex = e.target.value;
                  if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(hex))
                    update({ color: hexToRgbArray(hex) });
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Hizalama</Label>
          <ToggleGroup
            type="single"
            value={block.align ?? "left"}
            onValueChange={(v) => {
              if (!v) return;
              update({ align: v as "left" | "center" | "right" });
            }}
            variant="outline"
          >
            <ToggleGroupItem value="left" aria-label="Sola hizala">
              <AlignLeft className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Ortala">
              <AlignCenter className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Sağa hizala">
              <AlignRight className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Segments */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Metin segmentleri</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={addSegment}
          >
            <Plus className="size-3.5" /> Ekle
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {block.lines.map((seg, index) => (
            <div
              key={seg.id}
              className="flex flex-col gap-1.5 rounded-md border p-2 bg-muted/20"
            >
              <div className="flex items-center gap-1.5">
                <Select
                  value={seg.font}
                  onValueChange={(v) => updateSegment(seg.id, { font: v })}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typefaces.map((tf) => (
                      <SelectItem key={tf.id} value={tf.name}>
                        {tf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={index === 0}
                  onClick={() => reorderSegment(index, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={index === block.lines.length - 1}
                  onClick={() => reorderSegment(index, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  disabled={block.lines.length <= 1}
                  onClick={() => deleteSegment(seg.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={seg.text}
                  placeholder="Metin"
                  onChange={(e) =>
                    updateSegment(seg.id, { text: e.target.value })
                  }
                  className="h-8 text-sm"
                />
                <VariablePicker
                  onInsert={(token) =>
                    updateSegment(seg.id, {
                      text: (seg.text || "") + token,
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- QR ----------------

function QrProperties({
  qr,
  onQrcodeChange,
  onDeleteQr,
}: Props & { qr: PrismaJson.QRCode }) {
  const id = useId();
  const page = A4_LANDSCAPE_PT;
  const topY = page.height - qr.y;
  const fg = rgbToHex(qr.color);
  const bg = rgbToHex(qr.background);

  const update = (patch: Partial<PrismaJson.QRCode>) => {
    onQrcodeChange({ ...qr, ...patch });
  };

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="text-sm font-semibold">QR kodu</div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={onDeleteQr}
        >
          <Trash2 className="size-3.5 mr-1" /> Sil
        </Button>
      </header>

      {/* Visibility */}
      <div className="flex items-center justify-between rounded-md border p-3">
        <Label htmlFor={`${id}-show`} className="text-sm">
          Göster
        </Label>
        <Switch
          id={`${id}-show`}
          checked={qr.show}
          onCheckedChange={(show) => update({ show })}
        />
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-x`} className="text-xs">X (soldan)</Label>
          <Input
            id={`${id}-x`}
            type="number"
            inputMode="numeric"
            value={qr.x}
            onChange={(e) => update({ x: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-top`} className="text-xs">Üst (yukarıdan)</Label>
          <Input
            id={`${id}-top`}
            type="number"
            inputMode="numeric"
            value={Math.round(topY)}
            onChange={(e) => {
              const newTop = Number(e.target.value) || 0;
              update({ y: Math.round(page.height - newTop) });
            }}
          />
        </div>
      </div>

      {/* Size */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Boyut: {qr.width}pt</Label>
        <Slider
          value={[qr.width]}
          min={20}
          max={200}
          step={1}
          onValueChange={([v]) => update({ width: v })}
        />
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-2">
        <ColorInput
          label="Ön plan"
          color={fg}
          onChange={(hex) => update({ color: hexToRgbArray(hex) })}
        />
        <ColorInput
          label="Arka plan"
          color={bg}
          onChange={(hex) => update({ background: hexToRgbArray(hex) })}
        />
      </div>

      {/* Error correction */}
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-ec`} className="text-xs">Hata düzeltme seviyesi</Label>
        <Select
          value={qr.ec}
          onValueChange={(v) => update({ ec: v as PrismaJson.QRCode["ec"] })}
        >
          <SelectTrigger id={`${id}-ec`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="L">Düşük (L) — %7</SelectItem>
            <SelectItem value="M">Orta (M) — %15</SelectItem>
            <SelectItem value="Q">Yüksek (Q) — %25</SelectItem>
            <SelectItem value="H">Çok yüksek (H) — %30</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[11px] text-muted-foreground">
          Daha yüksek seviye = hasara daha dayanıklı QR, ama modüller daha sık.
        </span>
      </div>
    </section>
  );
}

function ColorInput({
  label,
  color,
  onChange,
}: {
  label: string;
  color: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start gap-2 h-9">
            <span
              className="inline-block size-4 rounded border"
              style={{ backgroundColor: color }}
            />
            <span className="font-mono text-xs">{color.toUpperCase()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3">
          <HexColorPicker color={color} onChange={onChange} />
          <Input
            className="mt-2 font-mono"
            value={color}
            onChange={(e) => {
              const hex = e.target.value;
              if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(hex)) onChange(hex);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
