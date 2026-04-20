import type { Route } from "./+types/org.program.$programId.templates.create";
import type { Template } from "~/generated/prisma/client";
import { useEffect, useState } from "react";

import { Form, isRouteErrorResponse, redirect, useNavigate, useParams, useRouteError, type ErrorResponse } from "react-router";
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
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  generateTemplateSample,
  generatePreviewOfTemplate,
  sampleLayout,
  sampleQR,
  saveTemplateUpload,
} from "~/lib/pdf.server";
import { locales, defaultLocale } from "~/lib/template-locales";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  let template: Template | void = undefined;

  const qrcode = { ...sampleQR };
  qrcode.show = true;

  const uploadHandler = async (fileUpload: FileUpload) => {
    if (
      fileUpload.fieldName === "pdf" &&
      fileUpload.type === "application/pdf"
    ) {
      template = await prisma.template
        .create({
          data: {
            name: "(Template Name)",
            layout: sampleLayout,
            qrcode,
            locale: defaultLocale.code,
            program: {
              connect: { id: Number(params.programId) },
            },
          },
        })
        .catch((error) => {
          throwErrorResponse(error, "Could not create template record");
        });

      if (template) {
        return await saveTemplateUpload(template, fileUpload);
      }
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
  const templatePDF = formData.get("pdf") as File;

  if (!templatePDF) {
    throw new Response(null, {
      status: 400,
      statusText: "Yüklenen PDF dosyası bulunamadı",
    });
  }

  template = await prisma.template
    .update({
      where: {
        id: template!.id, // if the upload handler and prisma.template.create did not run, this will throw an error that we can catch
      },
      data: {
        name: templateName,
        locale: templateLocale,
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not update template record");
    });

  if (template) {
    await generateTemplateSample(template);
    await generatePreviewOfTemplate(template);
    return redirect(
      `/org/program/${params.programId}/templates/${template.id}/edit-layout`,
    );
  }

  throw new Response(null, {
    status: 500,
    statusText: "Yeni şablon oluşturulurken bilinmeyen bir hata oluştu",
  });
}

export default function CreateTemplateDialog() {
  const [templateName, setTemplateName] = useState("");
  const navigate = useNavigate();
  const params = useParams();
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Şablon ekle</DialogTitle>
          <DialogDescription>
            Kendi PDF&apos;inizi yükleyin veya tarayıcıda boş bir şablon
            oluşturun. Sonraki adımda metin ve QR kodu yerleşimini
            düzenleyebilirsiniz.
          </DialogDescription>
        </DialogHeader>
        <div className="my-2 rounded-md border bg-muted/30 p-3 text-sm">
          PDF&apos;iniz yok mu? {" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 align-baseline"
            onClick={() =>
              navigate(`/org/program/${params.programId}/templates/create-blank`)
            }
          >
            Boş şablonla başla →
          </Button>
        </div>
        <Form method="POST" encType="multipart/form-data">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pdf">PDF dosyası seç</Label>
              <Input
                id="pdf"
                name="pdf"
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    let filename = e.target.files[0].name;
                    if (filename.lastIndexOf(".") > 0) {
                      filename = filename.substring(0, filename.lastIndexOf("."));
                    }
                    setTemplateName(filename);
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Şablon adı</Label>
              <Input
                id="name"
                name="name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="locale">Tarih biçimi</Label>
              <Select name="locale" defaultValue="tr-TR">
                <SelectTrigger>
                  <SelectValue placeholder="Tarih biçimi seç" />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((locale) => (
                    <SelectItem key={locale.code} value={locale.code}>
                      {locale.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">PDF&apos;i yükle</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let routeError : ErrorResponse | null = null;
  console.error(error);

  if (isRouteErrorResponse(error)) {
    routeError = error as ErrorResponse;
  }

  // @todo improve user-facing error display
  return <div>Error {routeError?.statusText}</div>;
}
