import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.create";
import type { Template } from "~/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { useEffect, useState } from "react";
import { Form, redirect, useNavigate, useNavigation } from "react-router";
import {
  getFormProps,
  getInputProps,
  getSelectProps,
  useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";

import { LoaderCircle } from "lucide-react";

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

import { requireAdminWithProgram } from "~/lib/auth.server";
import {
  generateCertificate,
  generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Sertifika Ekle" }];
}

import { CertificateInputSchema as schema } from "~/lib/schemas";

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
    .create({
      data: {
        uuid: randomUUID(),
        firstName: inputs.firstName,
        lastName: inputs.lastName,
        email: inputs.email,
        teamName: inputs.teamName,
        batch: {
          connect: { id: Number(params.batchId) },
        },
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
      throwErrorResponse(error, "Sertifika oluşturulamadı");
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
  });

  return { templates };
}

export default function CreateCertificateDialog({
  actionData,
  loaderData,
  params,
}: Route.ComponentProps) {
  const { templates } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [open, setOpen] = useState(true);

  const isSubmitting =
    navigation.formAction ===
    `/org/program/${params.programId}/batch/${params.batchId}/certificates/create`;

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(schema),
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
          <DialogTitle>Sertifika ekle</DialogTitle>
          <DialogDescription>
            Lütfen gerekli bilgileri ekle
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
            defaultValue={
              templates.length === 1 ? templates[0].id.toString() : undefined
            }
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
          <div id={form.errorId}>{form.errors}</div>
        </Form>
        <DialogFooter>
          <Button type="submit" form={form.id} disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="mr-2 animate-spin" />}
            Sertifika oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
