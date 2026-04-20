import type { Route } from "./+types/org.program.$programId.social";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Form, useFetcher } from "react-router";
import { ImageUp, Paintbrush, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { InputTiny } from "~/components/ui/input-tiny";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { defaultLayout } from "~/lib/social.server";

function calculateCertificateHeight(width: number, top: number) {
  let h = Math.round(width * 1.415);
  if (top + h > 630) {
    h = 630 - top;
  }
  return h;
}

export function meta() {
  return [{ title: "Sosyal Önizleme" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  // @todo refactor to program route loader to avoid duplicate data loading
  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
  });

  if (!program) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const social = await prisma.socialPreview.findUnique({
    where: {
      programId: Number(params.programId),
    },
  });

  // If layout was not initialized yet, return the default layout
  let layout = social?.layout;
  if (!layout || !layout.photo || !layout.certificate) {
    layout = defaultLayout;
  }

  return {
    program,
    social,
    socialLayout: layout,
  };
}

export default function ProgramSocialPage({
  loaderData,
}: Route.ComponentProps) {
  const { program, social, socialLayout } = loaderData;
  const fetcherImage = useFetcher({ key: "social-image" });
  const fetcherLayout = useFetcher({ key: "social-layout" });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewWithPhoto, setPreviewWithPhoto] = useState(true);
  const [layout, setLayout] = useState(socialLayout);

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleFileChanged = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      fetcherImage.submit(event.currentTarget.form, {
        method: "POST",
        encType: "multipart/form-data",
      });
      window.setTimeout(() => {
        event.target.value = "";
      }, 100);
    }
  };

  useEffect(() => {
    setLayout(socialLayout);
  }, [social?.id, socialLayout]);

  return (
    <div className="h-full flex flex-col justify-center items-start gap-4">
      {social && (
        <Form action="delete" method="POST">
          <Button variant="outline" type="submit">
            <Trash2 /> Sosyal Önizlemeyi Kaldır
          </Button>
        </Form>
      )}
      <div className="flex flex-row gap-4">
        <Card className="max-w-[650px]">
          <CardHeader>
            <CardTitle className="text-xl">
              Ad Soyad, {program.name} tarafından sertifikalandırıldı
            </CardTitle>
            <CardDescription>
              {program.achievement ??
                "[Lütfen program ayarlarından başarıya ilişkin bir açıklama ekleyin.]"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!social ? (
              <div className="w-full max-w-[600px] aspect-[1.91/1] flex border border-dashed border-slate-500 justify-center items-center bg-muted p-8">
                Lütfen sosyal medya önizlemesi için arka plan katmanını yükle.
                PNG ve JPEG görsel formatları desteklenmektedir. Görsel boyutu
                1200 x 630 piksel olmalıdır.
              </div>
            ) : (
              <img
                src={`social/preview.png?t=${social.updatedAt}${
                  previewWithPhoto ? "&withPhoto=1" : ""
                }`}
                className="w-full max-w-[600px] aspect-[1.91/1]"
                alt="Paylaşılan sertifikalar için sosyal medya önizlemesi"
              />
            )}
          </CardContent>
          <CardFooter></CardFooter>
        </Card>
        <Card>
          <CardHeader></CardHeader>
          <CardContent className="flex flex-col gap-6">
            <fetcherImage.Form
              method="POST"
              action="upload"
              encType="multipart/form-data"
            >
              <input
                type="file"
                name="backgroundImage"
                accept="image/png, image/jpeg"
                ref={fileRef}
                hidden
                onChange={handleFileChanged}
              />
              <Button
                type="button"
                onClick={handleUploadClick}
                disabled={fetcherImage.state !== "idle"}
              >
                <ImageUp />
                Arka plan görselini {social ? "değiştir" : "yükle"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {" "}
                1200x630 piksel, PNG veya JPEG
              </p>
            </fetcherImage.Form>
            <div className="flex flex-row justify-between items-center">
              <Label htmlFor="previewWithPhoto">Fotoğraflı Önizleme</Label>
              <Switch
                id="previewWithPhoto"
                checked={previewWithPhoto}
                onCheckedChange={setPreviewWithPhoto}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fotoğraf konumu</Label>
              <div className="flex flex-row gap-2">
                <InputTiny
                  label="X"
                  tooltip="Soldan X konumu (piksel)"
                  inputMode="numeric"
                  value={layout.photo.x}
                  onChange={(event) => {
                    const photo = {
                      ...layout.photo,
                      x: Number(event.target.value),
                    };
                    const update = { ...layout, photo };
                    setLayout(update);
                  }}
                />
                <InputTiny
                  label="Y"
                  tooltip="Üstten Y konumu (piksel)"
                  inputMode="numeric"
                  value={layout.photo.y}
                  onChange={(event) => {
                    const photo = {
                      ...layout.photo,
                      y: Number(event.target.value),
                    };
                    const update = { ...layout, photo };
                    setLayout(update);
                  }}
                />
                <InputTiny
                  label="W"
                  tooltip="Genişlik ve yükseklik (piksel)"
                  inputMode="numeric"
                  value={layout.photo.size}
                  onChange={(event) => {
                    const photo = {
                      ...layout.photo,
                      size: Number(event.target.value),
                    };
                    const update = { ...layout, photo };
                    setLayout(update);
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Sertifika konumu (fotoğraflı)</Label>
              <div className="flex flex-row gap-2">
                <InputTiny
                  label="X"
                  tooltip="Soldan X konumu (piksel)"
                  inputMode="numeric"
                  value={layout.certificate.withPhoto.x}
                  onChange={(event) => {
                    const withPhoto = {
                      ...layout.certificate.withPhoto,
                      x: Number(event.target.value),
                    };
                    const certificate = { ...layout.certificate, withPhoto };
                    const update = { ...layout, certificate };
                    setLayout(update);
                  }}
                />
                <InputTiny
                  label="Y"
                  tooltip="Üstten Y konumu (piksel)"
                  inputMode="numeric"
                  value={layout.certificate.withPhoto.y}
                  onChange={(event) => {
                    const withPhoto = {
                      ...layout.certificate.withPhoto,
                      y: Number(event.target.value),
                      h: calculateCertificateHeight(
                        layout.certificate.withPhoto.w,
                        Number(event.target.value),
                      ),
                    };
                    const certificate = { ...layout.certificate, withPhoto };
                    const update = { ...layout, certificate };
                    setLayout(update);
                  }}
                />
                <InputTiny
                  label="W"
                  tooltip="Genişlik (piksel)"
                  inputMode="numeric"
                  value={layout.certificate.withPhoto.w}
                  onChange={(event) => {
                    const withPhoto = {
                      ...layout.certificate.withPhoto,
                      w: Number(event.target.value),
                      h: calculateCertificateHeight(
                        Number(event.target.value),
                        layout.certificate.withPhoto.y,
                      ),
                    };
                    const certificate = { ...layout.certificate, withPhoto };
                    const update = { ...layout, certificate };
                    setLayout(update);
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Sertifika konumu (fotoğrafsız)</Label>
              <div className="flex flex-row gap-2">
                <InputTiny
                  label="X"
                  tooltip="Soldan X konumu (piksel)"
                  inputMode="numeric"
                  value={layout.certificate.noPhoto.x}
                  onChange={(event) => {
                    const noPhoto = {
                      ...layout.certificate.noPhoto,
                      x: Number(event.target.value),
                    };
                    const certificate = { ...layout.certificate, noPhoto };
                    const update = { ...layout, certificate };
                    setLayout(update);
                  }}
                />
                <InputTiny
                  label="Y"
                  tooltip="Üstten Y konumu (piksel)"
                  inputMode="numeric"
                  value={layout.certificate.noPhoto.y}
                  onChange={(event) => {
                    const noPhoto = {
                      ...layout.certificate.noPhoto,
                      y: Number(event.target.value),
                      h: calculateCertificateHeight(
                        layout.certificate.noPhoto.w,
                        Number(event.target.value),
                      ),
                    };
                    const certificate = { ...layout.certificate, noPhoto };
                    const update = { ...layout, certificate };
                    setLayout(update);
                  }}
                />
                <InputTiny
                  label="W"
                  tooltip="Genişlik (piksel)"
                  inputMode="numeric"
                  value={layout.certificate.noPhoto.w}
                  onChange={(event) => {
                    const noPhoto = {
                      ...layout.certificate.noPhoto,
                      w: Number(event.target.value),
                      h: calculateCertificateHeight(
                        Number(event.target.value),
                        layout.certificate.noPhoto.y,
                      ),
                    };
                    const certificate = { ...layout.certificate, noPhoto };
                    const update = { ...layout, certificate };
                    setLayout(update);
                  }}
                />
              </div>
            </div>

            <fetcherLayout.Form
              method="POST"
              action="update"
              className="flex flex-col"
            >
              <input
                type="hidden"
                name="layout"
                value={JSON.stringify(layout)}
              />
              <Button type="submit" disabled={fetcherLayout.state !== "idle"}>
                <Paintbrush />
                Yerleşimi güncelle
              </Button>
            </fetcherLayout.Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
