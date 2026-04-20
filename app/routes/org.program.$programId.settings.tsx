import type { Route } from "./+types/org.program.$programId.settings";
import { type ChangeEvent, useRef } from "react";
import { Form, useFetcher, useRouteLoaderData } from "react-router";

import { ImageUp, Trash2Icon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { FormUpdate } from "~/components/form-update";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Program Ayarları" }];
}

const allowedUpdateFields = ["name", "achievement", "about", "website"];

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };

  const update: { [key: string]: string } = {};

  allowedUpdateFields.forEach((field) => {
    if (inputs[field]) {
      update[field] = inputs[field].trim();
    }
  });

  const program = await prisma.program.update({
    where: {
      id: Number(params.programId),
    },
    data: update,
  });

  return { program };
}

export default function ProgramSettings() {
  // @todo typesafe use of useRouteLoaderData
  const { program } = useRouteLoaderData("routes/org.program.$programId");
  const fetcherIcon = useFetcher({ key: "program-icon" });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleFileChanged = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      fetcherIcon.submit(event.currentTarget.form, {
        method: "POST",
        encType: "multipart/form-data",
      });
      window.setTimeout(() => {
        event.target.value = "";
      }, 100);
    }
  };

  return (
    <>
      <div className="grid gap-8 py-4 max-w-[625px]">
        <section className="flex flex-col gap-2">
          <Label htmlFor="name">Program Adı</Label>
          <FormUpdate key={program.updatedAt}>
            <Input id="name" name="name" defaultValue={program.name} required />
          </FormUpdate>
        </section>

        <section className="flex flex-col gap-2">
          <Label htmlFor="achievement">Başarı</Label>
          <p className="text-sm text-muted-foreground max-w-[500px]">
            Sertifikanın temsil ettiği temel başarıları birkaç kelimeyle
            açıkla.
          </p>
          <FormUpdate key={program.updatedAt}>
            <Textarea
              id="achievement"
              name="achievement"
              defaultValue={program.achievement}
            />
          </FormUpdate>
        </section>

        <section className="flex flex-col gap-2">
          <Label htmlFor="about">Program hakkında</Label>
          <p className="text-sm text-muted-foreground max-w-[500px]">
            Programın kısa bir açıklamasını gir.
          </p>

          <FormUpdate key={program.updatedAt}>
            <Textarea
              id="about"
              name="about"
              defaultValue={program.about}
              rows={6}
            />
          </FormUpdate>
        </section>

        <section className="flex flex-col gap-2">
          <Label htmlFor="website">Web sitesi</Label>
          <p className="text-sm text-muted-foreground max-w-[500px]">
            Programın bir web sitesi varsa, bağlantıyı buraya ekle. Doğrudan
            başvuru sayfasına bağlantı vermeyi değerlendirebilirsin.
          </p>

          <FormUpdate key={program.updatedAt}>
            <Input
              id="website"
              name="website"
              defaultValue={program.website}
              placeholder="https://"
            />
          </FormUpdate>
        </section>

        <section className="flex flex-col gap-2">
          <Label>Logo</Label>
          <p className="text-sm text-muted-foreground max-w-[500px]">
            Programının görsel logo işaretini ekle. Bu, ölçeklenebilir vektör
            görseli (SVG) olmalı ve logo, kenarlarında ek boşluk bırakmadan
            şeffaf bir tuvalin ortasına yerleştirilmelidir.
          </p>
          <div className="flex gap-4 mt-2">
            {/* @todo implement a preview -> save workflow for changing the logo */}
            <div className="border rounded-lg aspect-square w-48 bg-white flex justify-center items-center">
              {program.logo ? (
                <img
                  src={`/logo/program/${program.logo.uuid}.svg?t=${program.logo.updatedAt}`}
                  alt=""
                  role="presentation"
                />
              ) : (
                "Logo Yok"
              )}
            </div>
            <div className="flex flex-col gap-2 items-stretch">
              <fetcherIcon.Form
                method="POST"
                action="logo-upload"
                encType="multipart/form-data"
              >
                <input
                  type="file"
                  accept="image/svg+xml"
                  name="programLogo"
                  ref={fileRef}
                  hidden
                  onChange={handleFileChanged}
                />
                <Button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={fetcherIcon.state !== "idle"}
                  className="w-full"
                >
                  <ImageUp />
                  Logoyu {program.logo ? "değiştir" : "yükle"}
                </Button>
              </fetcherIcon.Form>
              {program.logo && (
                <Form
                  action={`logo-delete`}
                  method="POST"
                  className="flex grow"
                >
                  <Button type="submit" variant="outline">
                    <Trash2Icon /> Logoyu kaldır
                  </Button>
                </Form>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-2 my-16">
        <Label>Tehlikeli Bölge</Label>
        <p className="text-sm text-muted-foreground max-w-[500px]">
          Şu anda, program silinmeden önce programın içindeki tüm sertifikalar
          ve dönemler silinmelidir.
        </p>

        <Form action={`../delete`} method="POST" className="flex grow">
          <Button type="submit" variant="destructive">
            <Trash2Icon /> Bu programı sil
          </Button>
        </Form>
      </section>
    </>
  );
}

// @todo add ErrorBoundary
