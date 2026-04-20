import type { Route } from "./+types/org.program.$programId.templates.$templateId.edit-meta";
import { useEffect, useState, useRef } from "react";
import { Form, redirect, useNavigate } from "react-router";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";

import { Trash2Icon } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdminWithProgram } from "~/lib/auth.server";
import {
  generateTemplateSample,
  generatePreviewOfTemplate,
  saveTemplateUpload,
} from "~/lib/pdf.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { defaultLocale, locales } from "~/lib/template-locales";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const existing = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
      programId: Number(params.programId),
    },
  });

  const uploadHandler = async (fileUpload: FileUpload) => {
    if (
      fileUpload.fieldName === "pdf" &&
      fileUpload.type === "application/pdf"
    ) {
      if (existing) return await saveTemplateUpload(existing, fileUpload);
    }
  };

  // @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@mjackson/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
  const formData = await parseFormData(
    request,
    { maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
    uploadHandler,
  );

  const templateName = (formData.get("name") as string) || "(Template Name)";
  const templateLocale =
    (formData.get("locale") as string) || defaultLocale.code;
  // const templatePDF = formData.get("pdf") as File;

  const template = await prisma.template
    .update({
      where: {
        id: Number(params.templateId),
        programId: Number(params.programId),
      },
      data: {
        name: templateName,
        locale: templateLocale,
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not update template");
    });

  if (template) {
    await generateTemplateSample(template);
    await generatePreviewOfTemplate(template, false);
  }

  return redirect(
    `/org/program/${params.programId}/templates/${params.templateId}/edit-layout`,
  );
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
      programId: Number(params.programId),
    },
  });

  if (!template) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return { template };
}

export default function EditTemplateDialog({
  loaderData,
}: Route.ComponentProps) {
  const { template } = loaderData;
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const formRef = useRef<HTMLFormElement | null>(null);

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
        <DialogHeader>
          <DialogTitle>Şablon ayarları</DialogTitle>
          <DialogDescription>
            Şablon bilgilerini gerektiği gibi değiştir. Ardından sertifikaları
            yenilemeyi unutma.
          </DialogDescription>
        </DialogHeader>
        <Form
          method="POST"
          encType="multipart/form-data"
          ref={formRef}
          className="grid gap-4 py-4"
        >
          <Label htmlFor="name">Ad</Label>
          <Input id="name" name="name" defaultValue={template.name} />

          <Label htmlFor="locale">Tarih biçimi</Label>
          <Select name="locale" defaultValue={template.locale}>
            <SelectTrigger id="locale">
              <SelectValue placeholder="Bir tarih biçimi seç" />
            </SelectTrigger>
            <SelectContent>
              {locales.map((locale) => (
                <SelectItem key={locale.code} value={locale.code}>
                  {locale.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label htmlFor="pdf">PDF şablonunu değiştir</Label>
          <Input id="pdf" name="pdf" type="file" accept="application/pdf" />
        </Form>
        <DialogFooter>
          <Form
            action={`../${template.id}/delete`}
            method="POST"
            className="flex grow"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="destructive" size="icon">
                  <Trash2Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Bu şablonu sil</TooltipContent>
            </Tooltip>
          </Form>
          <Button onClick={() => formRef.current?.submit()}>
            Değişiklikleri Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
