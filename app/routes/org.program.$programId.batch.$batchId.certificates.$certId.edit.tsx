import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.$certId.edit";
import type { Template } from "~/generated/prisma/client";
import { useEffect, useState } from "react";
import { Form, redirect, useNavigate, useNavigation } from "react-router";
import {
  getFormProps,
  getInputProps,
  getSelectProps,
  useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";

import { LoaderCircle, Trash2Icon } from "lucide-react";
import { FormField } from "~/components/form-field";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
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
  generateCertificate,
  generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { CertificateInputSchema as schema } from "~/lib/schemas";

export function meta() {
  return [{ title: "Sertifikayı Düzenle" }];
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  // Send the submission back to the client if the status is not successful
  if (submission.status !== "success") {
    return submission.reply();
  }

  const inputs = submission.value;

  const certificate = await prisma.certificate
    .update({
      where: {
        id: Number(params.certId),
        batch: {
          is: {
            programId: Number(params.programId),
          },
        },
      },
      data: {
        firstName: inputs.firstName,
        lastName: inputs.lastName,
        email: inputs.email,
        teamName: inputs.teamName,
        template: {
          connect: { id: Number(inputs.templateId) },
        },
      },
      include: {
        batch: true,
        template: true,
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Sertifika güncellenemedi");
    });

  if (certificate) {
    const skipIfExists = false;
    await generateCertificate(
      certificate.batch,
      certificate,
      certificate.template,
      skipIfExists,
    );
    await generatePreviewOfCertificate(certificate, skipIfExists);
  }

  return redirect(`../`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const certificate = await prisma.certificate.findUnique({
    where: {
      id: Number(params.certId),
      batch: {
        is: {
          programId: Number(params.programId),
        },
      },
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const templates = await prisma.template.findMany({
    where: {
      program: {
        is: {
          id: {
            equals: Number(params.programId),
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return { certificate, templates };
}

export default function EditCertificateDialog({
  actionData,
  loaderData,
  params,
}: Route.ComponentProps) {
  const { certificate, templates } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [open, setOpen] = useState(true);

  const isSubmitting =
    navigation.formAction ===
    `/org/program/${params.programId}/batch/${params.batchId}/certificates/${params.certId}/edit`;

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(schema),
    defaultValue: certificate,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema,
      });
    },
  });

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
          <DialogTitle>Sertifika ayarları</DialogTitle>
          <DialogDescription>
            Sertifika bilgilerini gerektiği şekilde değiştir.
          </DialogDescription>
        </DialogHeader>
        <Form method="POST" className="grid gap-2 py-4" {...getFormProps(form)}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <FormField
              {...getInputProps(fields.firstName, { type: "text" })}
              label="Ad"
              error={""}
            />
            <FormField
              {...getInputProps(fields.lastName, { type: "text" })}
              label="Soyad"
              error={fields.lastName.errors?.join(", ")}
            />
          </div>
          <div
            id={fields.firstName.errorId}
            className="-mt-3 mb-2 text-xs font-semibold text-red-500"
          >
            {fields.firstName.errors}
          </div>

          <FormField
            {...getInputProps(fields.email, { type: "email" })}
            label="E-posta"
            error={fields.email.errors?.join(", ")}
          />
          <FormField
            {...getInputProps(fields.teamName, { type: "text" })}
            label="Takım"
            error={fields.teamName.errors?.join(", ")}
          />
          <Label htmlFor="templateId">Şablon</Label>
          <Select
            {...getSelectProps(fields.templateId)}
            defaultValue={certificate.templateId.toString()}
          >
            <SelectTrigger>
              <SelectValue placeholder="Bir şablon seç" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template: Template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Form>
        <DialogFooter>
          <Form
            action={`../${certificate.id}/delete`}
            method="POST"
            className="flex grow"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="destructive" size="icon">
                  <Trash2Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Bu sertifikayı sil
              </TooltipContent>
            </Tooltip>
          </Form>
          <Button type="submit" form={form.id} disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="mr-2 animate-spin" />}
            Değişiklikleri Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
