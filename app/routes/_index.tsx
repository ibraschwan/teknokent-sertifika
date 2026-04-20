import type { Route } from "./+types/_index";
import type { Organisation, Program, User } from "~/generated/prisma/client";
import type { CertificatesWithBatchAndProgram } from "~/lib/types";

import { Link, redirect } from "react-router";
import Markdown from "markdown-to-jsx/react";
import { SidebarParticipant } from "~/components/sidebar-participant";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

import { requireUserId, getUser, logout } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getPublicOrg } from "~/lib/organisation.server";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `${data?.org?.name} Sertifikalar` },
    {
      name: "description",
      content: `${
        data?.org?.name || "bu kurumdan"
      } aldığın tüm sertifikalar tek bir yerde.`,
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request);
  const user = await getUser(request);

  if (!user) {
    return await logout(request);
  }

  // @todo parallelize DB requests instead of awaiting each one
  const org = await getPublicOrg();

  const certificates = await prisma.certificate.findMany({
    where: {
      email: user.email,
    },
    include: {
      batch: {
        include: {
          program: {
            include: {
              logo: true,
            },
          },
        },
      },
    },
    orderBy: {
      batch: {
        name: "asc",
      },
    },
  });

  if (certificates.length === 1) {
    return redirect(`/view/${certificates[0].uuid}`);
  }

  const programs = await prisma.program.findMany({
    where: {
      socialPreview: {
        isNot: null,
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return { user, org, programs, certificates };
}

// Loader from /_index route
export type LoaderReturnType = {
  user: User;
  org: Organisation;
  certificates: CertificatesWithBatchAndProgram[];
};

export default function Index({ loaderData }: Route.ComponentProps) {
  const { user, org, programs, certificates } = loaderData;

  // @todo fix unintended change of open/close state of the sidebar when navigating between _index and /view

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider defaultOpen={false}>
        <SidebarParticipant user={user} certificates={certificates} />

        <SidebarInset className="flex flex-col gap-4">
          <header className="sticky top-0 flex h-14 items-center gap-4 px-4 py-2 border-b sm:static sm:h-auto sm:border-0 sm:bg-transparent">
            <SidebarTrigger className="-ml-1" />
          </header>

          <h1 className="text-5xl font-bold px-16">
            {certificates.length === 0 ? "Merhaba" : "Tebrikler"}{" "}
            {user?.firstName}!
          </h1>

          <p className="px-16 max-w-[70ch] text-balance">
            {certificates.length === 0
              ? `Görünüşe göre henüz ${org.name} tarafından verilmiş bir sertifikan yok. Sertifikan eksikse lütfen program koordinatörünle iletişime geç. Henüz bir programa katılmadıysan, aşağıda sertifika sunan programlara göz atabilirsin.`
              : `${org.name} tarafından verilen tüm sertifikaların burada`}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 px-16 py-12 gap-16">
            {certificates.map((cert: CertificatesWithBatchAndProgram) => (
              <Link
                to={`/view/${cert.uuid}`}
                key={cert.id}
                className="flex flex-col gap-2"
              >
                <div className="pl-1">
                  <b>{cert.batch.program.name}</b>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {cert.batch.name}
                  </span>
                </div>
                <img
                  className="w-full mb-4 drop-shadow-xl hover:drop-shadow-lg hover:opacity-85"
                  src={`/cert/${cert.uuid}/preview.png?t=${cert.updatedAt}`}
                  alt={`${cert.batch.program.name} sertifikanın önizlemesi`}
                />
                <Button variant="outline">Sertifikayı aç</Button>
              </Link>
            ))}
          </div>

          {programs.length > 1 && (
            <>
              <div>
                <h3 className="text-lg font-bold px-16">
                  {org.name} tarafından sunulan diğer olanaklar
                </h3>
                <p className="text-sm   px-16">
                  Daha fazla sertifika almak istiyorsan, diğer programlarımıza
                  göz atabilirsin.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 p-16 pt-2 gap-8">
                {programs.map((program: Program) => (
                  <Card key={program.id}>
                    <CardHeader>
                      <CardTitle className="text-xl">{program.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Markdown>{program.about ?? ""}</Markdown>
                    </CardContent>
                    <CardFooter>
                      {/* @todo insert <wbr> tags into long urls for better breakpoints */}
                      {program.website && (
                        <a
                          href={program.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 break-all"
                        >
                          {program.website}
                        </a>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
