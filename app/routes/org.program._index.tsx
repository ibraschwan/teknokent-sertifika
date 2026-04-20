import type { Route } from "./+types/org.program._index";
import { Link } from "react-router";
import { FileBadge, FilePen, Settings, UsersIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { requireAdmin } from "~/lib/auth.server";
import { getProgramsByAdmin } from "~/lib/program.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Programlar" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const adminId = await requireAdmin(request);
  const programs = await getProgramsByAdmin(adminId);
  const batches = await prisma.batch.findMany({
    where: {
      programId: {
        in: programs.map((p) => p.id),
      },
    },
    include: {
      _count: {
        select: {
          certificates: true,
        },
      },
    },
  });

  return { programs, batches };
}

export default function OrgIndex({ loaderData }: Route.ComponentProps) {
  const { programs, batches } = loaderData;

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 items-stretch gap-4 md:gap-8">
      <div className="col-span-1 lg:col-span-2 xl:col-span-3">
        <Button asChild>
          <Link to="create">Program Ekle</Link>
        </Button>
      </div>

      {programs.map((program) => {
        let countCertificates = 0;
        batches.forEach(
          (b: { programId: number; _count: { certificates: number } }) => {
            if (b.programId === program.id) {
              countCertificates += b._count.certificates;
            }
          },
        );
        return (
          <Card key={program.id} className="justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="grow">
                <Link
                  to={`${program.id}/batch`}
                  className="flex flex-row items-center gap-4"
                >
                  {program.logo && (
                    <img
                      src={`/logo/program/${program.logo.uuid}.svg`}
                      alt=""
                      role="presentation"
                      className="w-8 aspect-square"
                    />
                  )}
                  {program.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild>
                <Link to={`${program.id}/batch`}>
                  <FileBadge /> {countCertificates}{" "}
                  {countCertificates === 1 ? "Sertifika" : "Sertifikalar"}
                </Link>
              </Button>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <Link to={`${program.id}/templates`}>
                        <FilePen />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Şablonları düzenle</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <Link
                        to={`${program.id}/user`}
                        aria-label="Erişimi yönet"
                      >
                        <UsersIcon />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Erişimi yönet</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <Link
                        to={`${program.id}/settings`}
                        aria-label="Programı düzenle"
                      >
                        <Settings />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Program ayarlarını düzenle
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
