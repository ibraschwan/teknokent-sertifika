import type { Route } from "./+types/org.typeface.create";
import type { Typeface } from "~/generated/prisma/client";
import { useEffect, useState } from "react";
import { Form, redirect, useNavigate, useRouteError } from "react-router";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { saveTypefaceUpload } from "~/lib/typeface.server";

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);

  let typeface: Typeface | void = undefined;

  const uploadHandler = async (fileUpload: FileUpload) => {
    if (fileUpload.fieldName === "ttf" && fileUpload.type === "font/ttf") {
      typeface = await prisma.typeface
        .create({
          data: {
            name: "(Typeface Name)",
            weight: 400,
            style: "tbd",
          },
        })
        .catch((error) => {
          throwErrorResponse(error, "Could not create typeface");
        });

      if (typeface) {
        return await saveTypefaceUpload(typeface, fileUpload);
      }
    }
  }

  // @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@mjackson/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
  const formData = await parseFormData(
    request,
    { maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
    uploadHandler,
  );

  const typefaceName =
    (formData.get("typefaceName") as string) || "(Typeface Name)";
  const weight = Number(formData.get("weight")) || 400;
  const style = (formData.get("style") as string) || "normal";
  const typefaceTTF = formData.get("ttf") as File;

  if (!typefaceTTF || typeface === undefined) {
    throw new Response(null, {
      status: 400,
      statusText: "Missing uploaded TTF file",
    });
  }

  typeface = await prisma.typeface
    .update({
      where: {
        // @ts-expect-error Typescript control flow doesn't recognize the assigment above and believes that `typeface` is a 'never'
        id: typeface.id,
      },
      data: {
        name: typefaceName,
        weight: weight,
        style: style,
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not import typeface");
    });

  return redirect(`/org/typeface`);
}

export default function CreateTypefaceDialog() {
  const [typefaceName, setTypefaceName] = useState("");
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <Form method="POST" encType="multipart/form-data">
          <DialogHeader>
            <DialogTitle>Yazı tipi ekle</DialogTitle>
            <DialogDescription>
              Metin görüntülemede kullanılabilecek yeni bir yazı tipi yükle.
              Yazı tipi dosyası Truetype biçiminde (.ttf) olmalıdır.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="ttf">Bir TTF dosyası seç</Label>
            <Input
              id="ttf"
              name="ttf"
              type="file"
              accept="font/ttf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  let filename = e.target.files[0].name;
                  if (filename.lastIndexOf(".") > 0) {
                    filename = filename.substring(0, filename.lastIndexOf("."));
                  }
                  setTypefaceName(filename);
                }
              }}
            />
            <Label htmlFor="typefaceName">Yazı tipi adı</Label>
            <Input
              id="typefaceName"
              name="typefaceName"
              value={typefaceName}
              onChange={(e) => setTypefaceName(e.target.value)}
            />
            <Label htmlFor="weight">Kalınlık</Label>
            <Select name="weight" defaultValue="400">
              <SelectTrigger>
                <SelectValue placeholder="Kalınlık seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="200">İnce</SelectItem>
                <SelectItem value="400">Normal</SelectItem>
                <SelectItem value="700">Kalın</SelectItem>
              </SelectContent>
            </Select>
            <Label htmlFor="style">Stil</Label>
            <Select name="style" defaultValue="normal">
              <SelectTrigger>
                <SelectValue placeholder="Stil seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="italic">İtalik</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Yazı Tipi Yükle</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);

  // @todo improve user-facing error display

  return <div>Hata</div>;
}
