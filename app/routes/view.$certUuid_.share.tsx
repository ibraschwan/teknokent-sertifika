import type { Route } from "./+types/view.$certUuid_.share";
import { useState } from "react";
import { Link, useLocation, useRouteLoaderData } from "react-router";
import Markdown from "markdown-to-jsx/react";
import { ClipboardCopy, ClipboardCheck, SquareUserRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { domain } from "~/lib/config.server";
import { requireUserId, getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { replaceVariables } from "~/lib/text-variables";

export function meta() {
  return [{ title: "Sertifikayı Paylaş" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUserId(request);
  const user = await getUser(request);

  const certificate = await prisma.certificate.findUnique({
    where: {
      uuid: params.certUuid,
    },
    include: {
      batch: {
        include: {
          program: true,
        },
      },
      template: {
        select: {
          locale: true,
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

  if (user?.email !== certificate.email) {
    throw new Response(null, {
      status: 403,
      statusText: "Forbidden",
    });
  }

  const social = await prisma.socialPreview.findUnique({
    where: {
      programId: certificate.batch.program.id,
    },
  });

  return { certificate, social, domain };
}

export default function ViewCertificateShare({
  loaderData,
}: Route.ComponentProps) {
  const { certificate, social, domain } = loaderData;
  // @todo figure out if useRouteLoaderData can by typed
  const { user } = useRouteLoaderData("routes/view");
  const { pathname } = useLocation();
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const certificateUrl = `${domain}/view/${certificate.uuid}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      <div className="flex flex-col px-4 py-3 grow">
        <header className="flex items-center h-14 gap-4 border-b sm:static sm:h-auto sm:border-0 sm:bg-transparent ">
          {user ? (
            <SidebarTrigger className="-ml-1" />
          ) : (
            <span className="w-5"></span>
          )}
          <span className="text-sm">
            <b>{certificate.batch.program.name}</b> &mdash;{" "}
            {certificate.batch.name}
          </span>
        </header>

        <section className="flex flex-col p-8 gap-4 grow">
          <h1 className="text-5xl font-bold mb-4">Sertifikanı paylaş</h1>

          <p>
            Başarılarını dünyayla paylaş ve sertifikanı LinkedIn veya diğer
            sosyal medya platformlarında yayınla.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Button asChild>
              <Link to="/user/photo" state={{ fromPath: pathname }}>
                <SquareUserRound />
                {user.photo ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
              </Link>
            </Button>
            {!user.photo && (
              <img
                src="/assets/scribble-add-photo.svg"
                alt="Kendini önizlemeye buradan ekle"
                className="ml-[75px] w-[60%] sm:w-[40%]"
              />
            )}
          </div>

          <Card className="max-w-[650px]">
            <CardHeader>
              <CardTitle className="text-xl">
                {certificate.firstName} {certificate.lastName},{" "}
                {certificate.batch.program.name} tarafından sertifikalandırıldı
              </CardTitle>
              <CardDescription>
                <Markdown>
                  {
                    /* @todo add variable replacements and Markdown render */
                    replaceVariables(
                      certificate.batch.program.achievement ?? "",
                      certificate.template.locale,
                      certificate,
                      certificate.batch,
                    ) ?? ""
                  }
                </Markdown>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!social ? (
                <div className="w-full max-w-[600px] aspect-[1.91/1] flex border border-dashed border-slate-500 justify-center items-center bg-muted"></div>
              ) : user.photo ? (
                <img
                  src={`/cert/${certificate.uuid}/social-preview.png?t=${certificate.updatedAt}`}
                  className="w-full max-w-[600px] aspect-[1.91/1]"
                  alt="Paylaşılan sertifikalar için sosyal medya önizlemesi"
                />
              ) : (
                <div className="grid grid-cols-1 grid-rows-1 w-full max-w-[600px]">
                  <img
                    src={`/cert/${certificate.uuid}/social-preview.png?t=${certificate.updatedAt}`}
                    className="w-full aspect-[1.91/1] col-start-1 row-start-1"
                    alt="Paylaşılan sertifikalar için sosyal medya önizlemesi"
                  />
                  <Link
                    to="/user/photo"
                    className="col-start-1 row-start-1 opacity-0 hover:opacity-100"
                    state={{ fromPath: pathname }}
                  >
                    <img
                      src={`/cert/${certificate.uuid}/social-preview.png?t=${certificate.updatedAt}&withPlaceholder=1`}
                      className="w-full aspect-[1.91/1]"
                      alt="Sertifikanızın görüneceği yerde bir yer tutucu bulunan sosyal medya önizlemesi"
                    />
                  </Link>
                </div>
              )}
            </CardContent>
            <CardFooter></CardFooter>
          </Card>
          <div className="flex flex-col sm:flex-row gap-2 max-w-[650px] mb-8">
            <Input defaultValue={certificateUrl} readOnly />
            <Button onClick={handleCopy} className="sm:w-40 sm:justify-start">
              {copiedToClipboard ? (
                <>
                  <ClipboardCheck />
                  Tamam
                </>
              ) : (
                <>
                  <ClipboardCopy />
                  Bağlantıyı kopyala
                </>
              )}
            </Button>
            <Button asChild>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                  certificateUrl,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn'de Paylaş
              </a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
