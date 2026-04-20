import type { Route } from "./+types/org.search";
import type { Route as RootRoute } from "../+types/root";
import { Link, useRouteLoaderData } from "react-router";

import { requireAdmin } from "~/lib/auth.server";
import { getProgramsByAdmin } from "~/lib/program.server";
import { prisma } from "~/lib/prisma.server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { MailCheck } from "lucide-react";
import { Button } from "~/components/ui/button";

export function meta() {
  return [{ title: "Search Organisation" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const adminId = await requireAdmin(request);
  const accessiblePrograms = (await getProgramsByAdmin(adminId)).map(
    (program) => program.id,
  );

  const term = new URL(request.url).searchParams.get("term");

  const certificates = await prisma.certificate.findMany({
    where: {
      OR: [
        {
          firstName: {
            startsWith: term ?? undefined,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            startsWith: term ?? undefined,
            mode: "insensitive",
          },
        },
      ],
      AND: [
        {
          batch: {
            is: {
              programId: {
                in: accessiblePrograms,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      uuid: true,
      firstName: true,
      lastName: true,
      teamName: true,
      email: true,
      notifiedAt: true,
      batch: {
        select: {
          id: true,
          name: true,
          program: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return {
    term,
    /* search results */
    results: {
      certificates,
    },
  };
}

export default function OrgSearchResults({ loaderData }: Route.ComponentProps) {
  const org =
    useRouteLoaderData<RootRoute.ComponentProps["loaderData"]>("root")?.org;
  const term = loaderData.term ?? "";
  const certificates = loaderData.results.certificates;

  return (
    <div className="flex flex-col gap-4">
      <p>
        Search results for ›{term}‹ in {org?.name}.<br />
        <span className="text-sm text-muted-foreground">
          Found {certificates.length} certificate
          {certificates.length !== 1 ? "s" : ""}.
        </span>
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="font-medium">Email</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Program</TableHead>
            <TableHead colSpan={2}>Actions</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {certificates.map((cert) => {
            return (
              <TableRow key={cert.uuid}>
                <TableCell>
                  {cert.firstName} {cert.lastName}
                </TableCell>
                <TableCell className="font-medium">{cert.email}</TableCell>
                <TableCell>{cert.teamName}</TableCell>
                <TableCell>
                  <Link
                    to={`/org/program/${cert.batch.program.id}/batch/${cert.batch.id}/certificates`}
                    className="hover:underline"
                  >
                    {cert.batch.name}
                  </Link>
                </TableCell>
                <TableCell>{cert.batch.program.name}</TableCell>
                <TableCell>
                  <Button variant="outline" asChild>
                    <Link
                      to={`/org/program/${cert.batch.program.id}/batch/${cert.batch.id}/certificates/${cert.id}/preview`}
                      className="hover:underline"
                    >
                      Open
                    </Link>
                  </Button>
                </TableCell>
                <TableCell>
                  {cert.notifiedAt ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MailCheck />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {cert.notifiedAt.toLocaleString("tr-TR")}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <>&emsp;</>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
