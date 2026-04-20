import type { Route } from "./+types/view.$certUuid";
import { useEffect, useState } from "react";
import { Link, useRouteLoaderData, useSearchParams } from "react-router";
import { ArrowRight, Download, Share } from "lucide-react";
import Markdown from "markdown-to-jsx/react";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getUser } from "~/lib/auth.server";
import { domain } from "~/lib/config.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { replaceVariables } from "~/lib/text-variables";

// @todo replace domain config
// @todo create a CertificateSelected type and use it here
export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: `${data?.certificate.firstName} ${data?.certificate.lastName}, ${data?.certificate.batch.program.name} tarafından sertifikalandırıldı`,
    },
    {
      name: "description",
      content: data?.certificate
        ? replaceVariables(
            data?.certificate.batch.program.achievement ?? "",
            data?.certificate.template.locale,
            data?.certificate,
            data?.certificate.batch,
          )
        : "",
    },
    {
      property: "og:title",
      content: `${data?.certificate.firstName} ${data?.certificate.lastName}, ${data?.certificate.batch.program.name} tarafından sertifikalandırıldı`,
    },
    {
      property: "og:description",
      content: data?.certificate
        ? replaceVariables(
            data?.certificate.batch.program.achievement ?? "",
            data?.certificate.template.locale,
            data?.certificate,
            data?.certificate.batch,
          )
        : "",
    },
    {
      property: "og:image",
      content: `${data?.domain}/cert/${data?.certificate.uuid}/social-preview.png?t=${data?.certificate.updatedAt.getTime()}`,
    },
    {
      property: "og:url",
      content: `${data?.domain}/view/${data?.certificate.uuid}`,
    },
  ];
}

// @todo select relevant individual fields for certificate, batch and program
export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getUser(request);

  const certificate = await prisma.certificate
    .findUnique({
      where: {
        uuid: params.certUuid,
      },
      select: {
        uuid: true,
        firstName: true,
        lastName: true,
        email: true,
        teamName: true,
        updatedAt: true,
        batch: {
          select: {
            name: true,
            startDate: true,
            endDate: true,
            program: {
              select: {
                name: true,
                about: true,
                achievement: true,
                website: true,
              },
            },
          },
        },
        template: {
          select: {
            locale: true,
          },
        },
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(
        error,
        "Aradığın sertifika bulunamadı.",
      );
    });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  let userIsOwner = false;
  if (user && user.email === certificate.email) {
    userIsOwner = true;
  }

  // Remove certificate email to prevent exposure // @todo Improve type safety for this
  certificate.email = "";
  return { certificate, userIsOwner, domain };
}

export default function ViewCertificate({ loaderData }: Route.ComponentProps) {
  const { certificate, userIsOwner } = loaderData;
  const { org, user } = useRouteLoaderData("routes/view");
  const [searchParams, setSearchParams] = useSearchParams();

  const paramSignup = searchParams.get("signup");
  const paramSignIn = searchParams.get("signin");

  const [signUpMail] = useState<string | null>(paramSignup);
  const [signInMail] = useState<string | null>(paramSignIn);

  useEffect(() => {
    if (paramSignup || paramSignIn) {
      setSearchParams({});
    }
  }, [paramSignup, paramSignIn, setSearchParams]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 min-h-screen">
      <div className="col-start-1 row-start-1 flex flex-col px-2 sm:px-4 py-3">
        <header className="flex items-center h-14 gap-4 border-b pb-2.5 sm:pb-0 sm:static sm:h-auto sm:border-0 sm:bg-transparent ">
          {user ? (
            <SidebarTrigger className="-ml-1" />
          ) : (
            <span className="w-5"></span>
          )}
          <div className="text-sm grow flex flex-col sm:flex-row">
            <b>{certificate.batch.program.name}</b>
            <div className="hidden sm:block px-2">&mdash;</div>
            {certificate.batch.name}
          </div>
          {!user && (
            <Button variant={signUpMail ? "default" : "outline"} asChild>
              {signUpMail ? (
                <Link to={`/user/sign/up?email=${signUpMail}`}>Kayıt ol</Link>
              ) : (
                <Link
                  to={`/user/sign/in${
                    signInMail ? "?email=".concat(signInMail) : ""
                  }`}
                >
                  Giriş yap
                </Link>
              )}
            </Button>
          )}
        </header>

        <section className="flex flex-col p-8 gap-4 max-w-[80ch]">
          <h1 className="text-5xl font-bold mb-4">
            {certificate.firstName} {certificate.lastName}
          </h1>

          {certificate.batch.program.achievement && (
            <Markdown>
              {replaceVariables(
                certificate.batch.program.achievement,
                certificate.template.locale,
                certificate,
                certificate.batch,
              )}
            </Markdown>
          )}

          <div className="flex flex-col sm:flex-row mt-4 gap-4">
            <Button asChild>
              <Link
                to={`/cert/${certificate.uuid}/download.pdf`}
                className="grow sm:grow-0"
                reloadDocument
              >
                <Download />
                Sertifikayı İndir
              </Link>
            </Button>
            {userIsOwner && (
              <Button asChild>
                <Link to={`/view/${certificate.uuid}/share`}>
                  <Share />
                  Sosyal Medyada Paylaş
                </Link>
              </Button>
            )}
            {!user && (signUpMail || signInMail) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild>
                    <Link
                      to={
                        signUpMail
                          ? `/user/sign/up?email=${signUpMail}`
                          : `/user/sign/in${
                              signInMail ? "?email=".concat(signInMail) : ""
                            }`
                      }
                    >
                      <Share />
                      Sosyal Medyada Paylaş
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Fotoğrafınla kişiselleştirilmiş bir önizleme paylaşmak için{" "}
                  {signInMail ? "giriş yap" : "kayıt ol"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </section>
      </div>
      <div className="col-start-1 row-start-3 xl:row-start-2 flex flex-col p-12 gap-4 justify-end max-w-[80ch]">
        {certificate.batch.program.about && (
          <>
            <h3 className="font-bold">
              {certificate.batch.program.name} Hakkında
            </h3>
            <Markdown>{certificate.batch.program.about}</Markdown>
          </>
        )}

        {
          /* @todo improve word breaks with <wbr> in links */
          certificate.batch.program.website && (
            <a
              href={certificate.batch.program.website}
              className="self-start inline-flex underline underline-offset-2 break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowRight className="mr-2" />
              {certificate.batch.program.website}
            </a>
          )
        }

        <div className="text-xs mt-8">
          {org?.name}&emsp;&middot;&emsp;
          {org?.imprintUrl && (
            <a href={org.imprintUrl} target="_blank" rel="noopener noreferrer">
              Künye
            </a>
          )}
          &emsp;&middot;&emsp;
          {org?.privacyUrl && (
            <a href={org.privacyUrl} target="_blank" rel="noopener noreferrer">
              Gizlilik
            </a>
          )}
        </div>
      </div>
      <div className="col-start-1 row-start-2 xl:col-start-2 xl:row-span-2 xl:row-start-1 px-12 pt-4 pb-12">
        <img
          className="drop-shadow-xl h-full max-h-[calc(100vh-64px)] object-contain"
          src={`/cert/${certificate.uuid}/preview.png?t=${certificate.updatedAt}`}
          alt="Sertifika önizlemesi"
        />
      </div>
    </div>
  );
}
