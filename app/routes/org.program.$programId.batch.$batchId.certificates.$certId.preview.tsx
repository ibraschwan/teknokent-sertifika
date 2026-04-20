import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.$certId.preview";
import { Link } from "react-router";

import { XIcon } from "lucide-react";
import { H2 } from "~/components/typography/headlines";
import { Button } from "~/components/ui/button";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Sertifika Önizleme" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const certificate = await prisma.certificate.findUnique({
    where: {
      id: Number(params.certId),
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const socialPreview = await prisma.socialPreview.findUnique({
    where: {
      programId: Number(params.programId),
    },
  });

  return { certificate, socialPreview };
}

export default function CertificatePage({ loaderData }: Route.ComponentProps) {
  const { certificate, socialPreview } = loaderData;

  return (
    <div className="flex flex-col bg-background h-full w-[40%] mt-24 fixed z-50 bottom-0 right-0 p-4 gap-8 pb-12 overflow-auto drop-shadow-xl">
      <div className="flex justify-end">
        <Button variant="outline" size="icon" asChild>
          <Link to="../">
            <XIcon />
          </Link>
        </Button>
      </div>
      <H2 /* className="flex px-8" */>
        {certificate.firstName} {certificate.lastName}
      </H2>

      <div className="flex px-8 gap-2">
        <Button asChild>
          <Link to={`/cert/${certificate.uuid}/download.pdf`} reloadDocument>
            Sertifikayı İndir
          </Link>
        </Button>
        <Button variant="link" asChild>
          <Link to={`/view/${certificate.uuid}`}>Genel sayfayı görüntüle</Link>
        </Button>
      </div>

      <img
        className="px-8 drop-shadow-xl self-center"
        src={`/cert/${certificate.uuid}/preview.png?t=${certificate.updatedAt}`}
        alt="Sertifika önizlemesi"
      />

      {socialPreview && (
        <div className="px-8">
          <span className="text-sm font-semibold text-muted-foreground">
            Sosyal Medya Önizlemesi
          </span>
          <img
            src={`/cert/${certificate.uuid}/social-preview.png?t=${certificate.updatedAt}`}
            className="drop-shadow-xl aspect-[1.91/1]"
            alt="Paylaşılan sertifikalar için sosyal medya önizlemesi"
          />
        </div>
      )}
    </div>
  );
}
