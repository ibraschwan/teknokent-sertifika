// This layout editor is for the PDF template layouts
// @todo rename component to clarify the function
import { useState } from "react";
import type { Typeface } from "~/generated/prisma/client";
import { HexColorPicker } from "react-colorful";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Braces,
  PlusIcon,
  Trash2,
  TextInitial,
  SquarePlus
} from "lucide-react";
import { FontSizeIcon, LineHeightIcon } from "@radix-ui/react-icons";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { InputTiny } from "~/components/ui/input-tiny";
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
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { generateRandomId, hexToRgbArray, rgbToHex } from "~/lib/utils";

function Toolbar({
  settings,
  onChange,
  onDelete,
}: {
  settings: PrismaJson.TextBlock;
  onChange: (changedSettings: PrismaJson.TextBlock) => void;
  onDelete: () => void;
}) {
  const color = rgbToHex(settings.color || [0, 0, 0]);
  const [align, setAlign] = useState(settings.align || "left");

  // @todo fix layout / overflow / wrapping on small screens
  return (
    <div className="flex bg-muted pl-4 pr-2 py-2">
      <div className="flex grow flex-wrap items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <TextInitial className="size-4 mr-3" />
          </TooltipTrigger>
          <TooltipContent side="top">Metin bloğu</TooltipContent>
        </Tooltip>
        <InputTiny
          label="X"
          tooltip="X konumu (nokta)"
          inputMode="numeric"
          value={settings.x}
          onChange={(event) => {
            const update = { ...settings, x: Number(event.target.value) };
            onChange(update);
          }}
        />
        <InputTiny
          label="Y"
          tooltip="Alttan Y konumu (nokta)"
          inputMode="numeric"
          value={settings.y}
          onChange={(event) => {
            const update = { ...settings, y: Number(event.target.value) };
            onChange(update);
          }}
        />
        <InputTiny
          label="W"
          tooltip="Maksimum genişlik (isteğe bağlı)"
          inputMode="numeric"
          value={settings.maxWidth}
          onChange={(event) => {
            const update = {
              ...settings,
              maxWidth: Number(event.target.value) || undefined,
            };
            onChange(update);
          }}
        />
        &emsp;
        <Popover>
          <PopoverTrigger className="h-8 flex items-center rounded-md border border-input bg-background px-1.5 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="w-6 h-5 rounded-sm"
                  style={{ backgroundColor: `#${color}` }}
                ></div>
              </TooltipTrigger>
              <TooltipContent side="top">Metin rengi</TooltipContent>
            </Tooltip>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-2xl flex flex-col gap-2">
            <HexColorPicker
              color={color}
              onChange={(newColor) => {
                const update = {
                  ...settings,
                  color: hexToRgbArray(newColor),
                };
                onChange(update);
              }}
            />
            <Input
              value={color}
              onChange={(event) => {
                // try ... catch because of possible invalid user input
                try {
                  onChange({
                    ...settings,
                    color: hexToRgbArray(event.target.value),
                  });
                } catch (error) {
                  // @todo fix typing out hex values (because invalid values are rejected, you can only change single characters or copy/paste)
                  console.log("Invalid color: ", event.target.value, error);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <InputTiny
          label={<FontSizeIcon />}
          tooltip="Yazı boyutu"
          inputMode="numeric"
          value={settings.size}
          onChange={(event) => {
            onChange({ ...settings, size: Number(event.target.value) });
          }}
        />
        <InputTiny
          label={<LineHeightIcon />}
          tooltip="Satır yüksekliği (isteğe bağlı)"
          inputMode="numeric"
          value={settings.lineHeight}
          onChange={(event) => {
            onChange({
              ...settings,
              lineHeight: Number(event.target.value) || undefined,
            });
          }}
        />
        &emsp;
        <ToggleGroup
          type="single"
          value={align}
          onValueChange={(value) => {
            if (
              value &&
              (value === "left" || value === "center" || value === "right")
            ) {
              onChange({ ...settings, align: value });
              setAlign(value);
            }
          }}
        >
          <ToggleGroupItem
            value="left"
            aria-label="Sola hizala"
            className="data-[state=on]:text-primary data-[state=off]:text-muted-foreground"
          >
            <AlignLeft />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="center"
            aria-label="Ortaya hizala"
            className="data-[state=on]:text-primary data-[state=off]:text-muted-foreground"
          >
            <AlignCenter />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="right"
            aria-label="Sağa hizala"
            className="data-[state=off]:text-muted-foreground"
          >
            <AlignRight />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Bloğu kaldır</TooltipContent>
      </Tooltip>
    </div>
  );
}

function TextRow({
  segmentId,
  settings,
  fonts,
  onChangeSegment,
  onDelete,
}: {
  segmentId: string;
  settings: PrismaJson.TextSegment;
  fonts: Typeface[];
  onChangeSegment: (changedSegment: PrismaJson.TextSegment) => void;
  onDelete: () => void;
}) {
  const addVariable = (variable: string) => {
    onChangeSegment({
      id: segmentId,
      text: settings.text + variable,
      font: settings.font,
    });
  };

  return (
    <tr>
      <td className="pl-4 pr-1 py-0.5">
        <Input
          id={`${segmentId}-text`}
          key={`${segmentId}-text`}
          value={settings.text}
          className="grow"
          onChange={(event) =>
            onChangeSegment({
              id: segmentId,
              text: event.target.value,
              font: settings.font,
            })
          }
        />
      </td>
      <td>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="my-button">
              <Braces />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Değişken ekle</DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Dönem</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.name}")}
                  >
                    Ad
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.startDate}")}
                  >
                    Başlangıç tarihi
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.endDate}")}
                  >
                    Bitiş tarihi
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.signatureDate}")}
                  >
                    İmza tarihi
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{batch.signatureDateLong}")}
                  >
                    İmza tarihi (uzun)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Sertifika</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.fullName}")}
                  >
                    Ad Soyad
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.firstName}")}
                  >
                    Ad
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.lastName}")}
                  >
                    Soyad
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.teamName}")}
                  >
                    Takım Adı
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.id}")}
                  >
                    Benzersiz Kimlik
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.fullNameCaps}")}
                  >
                    AD SOYAD
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.firstNameCaps}")}
                  >
                    AD
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{certificate.firstNameCaps}")}
                  >
                    SOYAD
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Tarih</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{datetime.currentDate}")}
                  >
                    Bugünkü tarih
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => addVariable("{datetime.currentMonth}")}
                  >
                    Bu ay
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-1">
        <Select
          key={`${segmentId}-font`}
          value={settings.font}
          onValueChange={(fontName) => {
            onChangeSegment({
              id: segmentId,
              text: settings.text,
              font: fontName,
            });
          }}
        >
          <SelectTrigger className="w-full" size="compact">
            <SelectValue placeholder="Yazı tipi seç" />
          </SelectTrigger>
          <SelectContent>
            {fonts.map((font: Typeface) => (
              <SelectItem key={font.id} value={font.name}>
                {font.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="pr-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="px-0"
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Segmenti kaldır</TooltipContent>
        </Tooltip>
      </td>
    </tr>
  );
}

function TextBlock({
  blockId,
  settings,
  fonts,
  onChangeBlock,
  onDelete,
}: {
  blockId: string;
  settings: PrismaJson.TextBlock;
  fonts: Typeface[];
  onChangeBlock: (updatedBlock: PrismaJson.TextBlock) => void;
  onDelete: () => void;
}) {
  const segments = settings.lines.map(
    (segment: PrismaJson.TextSegment, index: number) => {
      const segmentId = segment.id || generateRandomId();
      return (
        <TextRow
          key={segmentId}
          segmentId={segmentId}
          settings={segment}
          fonts={fonts}
          onChangeSegment={(changedSegment: PrismaJson.TextSegment) => {
            const updateSegments = [...settings.lines];
            updateSegments[index] = changedSegment;
            onChangeBlock({
              ...settings,
              id: blockId,
              lines: updateSegments,
            });
          }}
          onDelete={() => {
            const updateSegments = settings.lines.toSpliced(index, 1);
            onChangeBlock({
              ...settings,
              id: blockId,
              lines: updateSegments,
            });
          }}
        />
      );
    },
  );
  return (
    <div className="flex flex-col gap-2 text-sm rounded-lg border bg-card text-card-foreground shadow-sm">
      <Toolbar
        settings={settings}
        onChange={(changedSettings: PrismaJson.TextBlock) => {
          onChangeBlock({ ...changedSettings, id: blockId });
        }}
        onDelete={onDelete}
      />
      <table>
        <colgroup>
          <col width="70%" />
          <col width="40" />
          <col />
          <col width="40" />
        </colgroup>
        <tbody>{segments}</tbody>
      </table>
      <Button
        type="button"
        variant="ghost"
        className="text-sm mx-4 mb-2 h-8"
        onClick={() => {
          onChangeBlock({
            ...settings,
            lines: [
              ...settings.lines,
              { id: generateRandomId(), text: "", font: fonts[0].name },
            ],
          });
        }}
      >
        <PlusIcon className="mr-2" /> Metin segmenti ekle
      </Button>
    </div>
  );
}

export function LayoutEditor({
  layout,
  fonts,
  onChange,
}: {
  layout: PrismaJson.TextBlock[];
  fonts: Typeface[];
  onChange: (updatedLayout: PrismaJson.TextBlock[]) => void;
}) {
  const blocks = layout.map((block: PrismaJson.TextBlock, index: number) => {
    const blockId = block.id || generateRandomId();
    return (
      <TextBlock
        key={blockId}
        blockId={blockId}
        settings={block}
        fonts={fonts}
        onChangeBlock={(updatedBlock: PrismaJson.TextBlock) => {
          const updateLayout = [...layout];
          updateLayout[index] = updatedBlock;
          onChange(updateLayout);
        }}
        onDelete={() => {
          const updateLayout = layout.toSpliced(index, 1);
          onChange(updateLayout);
        }}
      />
    );
  });
  return (
    <div className="flex flex-col gap-4">
      {blocks}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const updateLayout = [...layout];
          updateLayout.push({
            id: generateRandomId(),
            x: 0,
            y: 0,
            size: 12,
            lines: [{ id: generateRandomId(), text: "", font: fonts[0].name }],
          });
          onChange(updateLayout);
        }}
      >
        <SquarePlus className="mr-2" /> Metin bloğu ekle
      </Button>
    </div>
  );
}
