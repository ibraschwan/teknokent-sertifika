import type { Route } from "./+types/org.program.$programId.templates.create-blank";
import type { Template } from "~/generated/prisma/client";
import { useEffect, useState } from "react";

import { Form, redirect, useNavigate } from "react-router";

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

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  generateBlankTemplatePDF,
  generateTemplateSample,
  generatePreviewOfTemplate,
  sampleLayout,
  sampleQR,
  type BlankTemplateOrientation,
  type BlankTemplateStyle,
} from "~/lib/pdf.server";
import { locales, defaultLocale } from "~/lib/template-locales";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const name = (formData.get("name") as string)?.trim() || "Yeni Şablon";
  const locale = (formData.get("locale") as string) || defaultLocale.code;
  const style = ((formData.get("style") as string) || "bordered") as BlankTemplateStyle;
  const orientation = ((formData.get("orientation") as string) || "landscape") as BlankTemplateOrientation;

  const qrcode = { ...sampleQR };
  qrcode.show = true;

  let template: Template | undefined;
  try {
    template = await prisma.template.create({
      data: {
        name,
        layout: sampleLayout,
        qrcode,
        locale,
        program: { connect: { id: Number(params.programId) } },
      },
    });
  } catch (error) {
    throwErrorResponse(error, "Şablon kaydı oluşturulamadı");
  }

  if (!template) {
    throw new Response(null, { status: 500, statusText: "Bilinmeyen bir hata oluştu" });
  }

  await generateBlankTemplatePDF(template, style, orientation);
  await generateTemplateSample(template);
  await generatePreviewOfTemplate(template);

  return redirect(
    `/org/program/${params.programId}/templates/${template.id}/edit-layout`,
  );
}

export default function CreateBlankTemplateDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [name, setName] = useState("Yeni Şablon");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <Form method="POST">
          <DialogHeader>
            <DialogTitle>Boş şablon oluştur</DialogTitle>
            <DialogDescription>
              Tarayıcıda basit bir PDF şablonu oluşturun. Sonraki adımda metin
              ve QR kodu yerleşimini düzenleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Şablon adı</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="style">Stil</Label>
              <Select name="style" defaultValue="bordered">
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bordered">Çerçeveli (ODTÜ mavisi)</SelectItem>
                  <SelectItem value="ribbon">Üst ve alt şerit</SelectItem>
                  <SelectItem value="plain">Düz (boş sayfa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="orientation">Yön</Label>
              <Select name="orientation" defaultValue="landscape">
                <SelectTrigger id="orientation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Yatay (A4)</SelectItem>
                  <SelectItem value="portrait">Dikey (A4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="locale">Tarih biçimi</Label>
              <Select name="locale" defaultValue="tr-TR">
                <SelectTrigger id="locale">
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
          </div>
          <DialogFooter>
            <Button type="submit">Şablonu oluştur ve düzenle</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
