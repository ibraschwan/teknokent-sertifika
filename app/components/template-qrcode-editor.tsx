// This layout editor is for the PDF template layouts
// @todo rename component to clarify the function

import type { Dispatch, SetStateAction } from "react";

import { HexColorPicker } from "react-colorful";
import { Eye, EyeOff, QrCode } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { InputTiny } from "~/components/ui/input-tiny";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { hexToRgbArray, rgbToHex } from "~/lib/utils";

function Toolbar({
  settings,
  onChange,
}: {
  settings: PrismaJson.QRCode;
  onChange: Dispatch<SetStateAction<PrismaJson.QRCode | null>>;
}) {
  const color = rgbToHex(settings.color || [0, 0, 0]);
  const background = rgbToHex(settings.background || [1, 1, 1]);
  // @todo fix layout / overflow / wrapping on small screens
  return (
    <div className="flex bg-muted pl-4 pr-2 py-2">
      <div className="flex grow flex-wrap items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <QrCode className="size-4 mr-3" />
          </TooltipTrigger>
          <TooltipContent side="top">QR kodu</TooltipContent>
        </Tooltip>
        <InputTiny
          label="X"
          tooltip="X konumu (nokta)"
          inputMode="numeric"
          value={settings.x}
          onChange={(event) => {
            onChange({ ...settings, x: Number(event.target.value) });
          }}
        />
        <InputTiny
          label="Y"
          tooltip="Alttan Y konumu (nokta)"
          inputMode="numeric"
          value={settings.y}
          onChange={(event) => {
            onChange({ ...settings, y: Number(event.target.value) });
          }}
        />
        <InputTiny
          label="W"
          tooltip="Genişlik"
          inputMode="numeric"
          value={settings.width}
          onChange={(event) => {
            onChange({
              ...settings,
              width: Number(event.target.value) || settings.width,
            });
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
              <TooltipContent side="top">Dolgu rengi</TooltipContent>
            </Tooltip>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-2xl flex flex-col gap-2">
            <HexColorPicker
              color={color}
              onChange={(newColor) => {
                onChange({
                  ...settings,
                  color: hexToRgbArray(newColor),
                });
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
                  console.log("Invalid color: ", event.target.value);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger className="h-8 flex items-center rounded-md border border-input bg-background px-1.5 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="w-6 h-5 rounded-sm"
                  style={{ backgroundColor: `#${background}` }}
                ></div>
              </TooltipTrigger>
              <TooltipContent side="top">Arka plan rengi</TooltipContent>
            </Tooltip>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-2xl flex flex-col gap-2">
            <HexColorPicker
              color={background}
              onChange={(newColor) => {
                onChange({
                  ...settings,
                  color: hexToRgbArray(newColor),
                });
              }}
            />
            <Input
              value={background}
              onChange={(event) => {
                // try ... catch because of possible invalid user input
                try {
                  onChange({
                    ...settings,
                    color: hexToRgbArray(event.target.value),
                  });
                } catch (error) {
                  // @todo fix typing out hex values (because invalid values are rejected, you can only change single characters or copy/paste)
                  console.log("Invalid color: ", event.target.value);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        &emsp;
        {/*<Select
          value={settings.ec}
          onValueChange={(ec: "L" | "M" | "Q" | "H") => {
            onChange({ ...settings, ec });
          }}

        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Error Correction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="L">Low – 7%</SelectItem>
            <SelectItem value="M">Medium – 15%</SelectItem>
            <SelectItem value="Q">Quartile – 25%</SelectItem>
            <SelectItem value="H">High – 30%</SelectItem>
          </SelectContent>
        </Select>*/}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onChange({ ...settings, show: !settings.show });
            }}
          >
            {settings.show ? <Eye /> : <EyeOff />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {settings.show ? "Kodu gizle" : "Kodu göster"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function LayoutQRCodeEditor({
  qrcode,
  onChange,
}: {
  qrcode: PrismaJson.QRCode;
  onChange: Dispatch<SetStateAction<PrismaJson.QRCode | null>>;
}) {
  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex flex-col gap-2 text-sm rounded-lg border bg-card text-card-foreground shadow-sm">
        <Toolbar settings={qrcode} onChange={onChange} />
        <div className="px-4 pt-1 pb-3 flex items-center gap-2">
          QR kodu, sertifikanın herkese açık web sayfasına yönlendiren URL'yi
          içerir. Sertifikayı doğrulamak için kullanılabilir.
        </div>
      </div>
    </div>
  );
}
