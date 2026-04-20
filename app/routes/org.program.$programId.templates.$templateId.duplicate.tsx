import type { Route } from "./+types/org.program.$programId.templates.$templateId.duplicate";
import { useEffect, useState, useRef } from "react";
import { Form, redirect, useNavigate } from "react-router";
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

import { requireAdminWithProgram } from "~/lib/auth.server";
import {
  generateTemplateSample,
  generatePreviewOfTemplate,
  saveTemplateUpload,
  duplicateTemplate,
} from "~/lib/pdf.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { locales } from "~/lib/template-locales";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const existing = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
    },
  });

  if (!existing) {
    throw new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  let template = await prisma.template
    .create({
      data: {
        name: `${existing.name} Copy`,
        layout: existing.layout as PrismaJson.TextBlock[],
        qrcode: existing.qrcode ?? undefined,
        locale: existing.locale,
        program: {
          connect: { id: Number(params.programId) },
        },
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could create duplicated template record");
    });

  if (template) {
    const uploadHandler = async (fileUpload: FileUpload) => {
      if (
        fileUpload.fieldName === "pdf" &&
        fileUpload.type === "application/pdf"
      ) {
        if (template) return await saveTemplateUpload(template, fileUpload);
      }
    };

    // @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@mjackson/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
    const formData = await parseFormData(
      request,
      { maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
      uploadHandler,
    );

    const templateName =
      (formData.get("name") as string) || `${existing.name} Copy`;
    const templateLocale =
      (formData.get("locale") as string) || existing.locale;
    const templatePDF = formData.get("pdf") as File;

    template = await prisma.template
      .update({
        where: {
          id: template.id,
        },
        data: {
          name: templateName,
          locale: templateLocale,
        },
      })
      .catch((error) => {
        throwErrorResponse(
          error,
          "Could not update duplicated template record",
        );
      });

    if (template) {
      if (templatePDF) {
        await generateTemplateSample(template);
        await generatePreviewOfTemplate(template, false);
      } else {
        await duplicateTemplate(existing, template);
      }

      return redirect(
        `/org/program/${params.programId}/templates/${template.id}/edit-layout`,
      );
    }
  }

  throw new Response(null, {
    status: 500,
    statusText: "Unkown error when duplicating template",
  });
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

export default function DuplicateTemplateDialog({
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

  // @todo refactor date locale options to a single source of thruth here and in edit-meta

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Şablonu çoğalt</DialogTitle>
          <DialogDescription>
            Şu anda seçili şablondaki tüm ayarlarla yeni bir şablon
            oluşturulacak. Yedek olarak yeni bir PDF dosyası seçebilir ya da
            mevcut PDF'i kullanmak için boş bırakabilirsin.
          </DialogDescription>
        </DialogHeader>
        <Form
          method="POST"
          encType="multipart/form-data"
          ref={formRef}
          className="grid gap-4 py-4"
        >
          <Label htmlFor="name">Ad</Label>
          <Input id="name" name="name" defaultValue={`${template.name} kopya`} />

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
          <Button variant="outline" onClick={() => navigate(-1)}>
            Geri
          </Button>
          <Button onClick={() => formRef.current?.submit()}>
            Kopya oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
