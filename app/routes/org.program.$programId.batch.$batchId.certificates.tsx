import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates";
import type { Certificate, Template } from "~/generated/prisma/client";
import { Link, Outlet, useParams } from "react-router";

import { ChevronDown, Eye, MailCheck, Settings } from "lucide-react";

import { CertificateRefresh } from "~/components/certificate-refresh";
import { CertificateSendNotification } from "~/components/certificate-send-notification";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

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

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { AsyncAction } from "~/components/async-action";

export function meta() {
  return [{ title: "Sertifikalar" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const certificates = await prisma.certificate.findMany({
    where: {
      batch: {
        is: {
          id: Number(params.batchId),
          programId: Number(params.programId),
        },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

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

  return { certificates, templates };
}

export default function BatchCertificatesPage({
  loaderData,
}: Route.ComponentProps) {
  const { programId } = useParams();
  const { certificates, templates } = loaderData;

  const templatesMap = new Map<number, Template>();
  for (const template of templates) {
    templatesMap.set(template.id, template);
  }

  let certificatesNeedsRefresh = 0;
  for (const certificate of certificates) {
    const lastTemplateUpdate = templatesMap.get(
      certificate.templateId,
    )?.updatedAt;
    if (lastTemplateUpdate && lastTemplateUpdate > certificate.updatedAt) {
      certificatesNeedsRefresh++;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad Soyad</TableHead>
            <TableHead className="font-medium">E-posta</TableHead>
            <TableHead>Takım</TableHead>
            <TableHead>
              <div className="flex items-center">
                Şablon&emsp;
                {certificatesNeedsRefresh > 0 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="destructive">
                        {certificatesNeedsRefresh}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {certificatesNeedsRefresh} sertifikanın yenilenmesi
                      gerekiyor
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TableHead>
            <TableHead colSpan={2}>İşlemler</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {certificates.map((cert: Certificate) => {
            const template = templatesMap.get(cert.templateId);
            return (
              <TableRow key={cert.email}>
                <TableCell>
                  {cert.firstName} {cert.lastName}
                </TableCell>
                <TableCell className="font-medium">{cert.email}</TableCell>
                <TableCell>
                  {cert.teamName || <Badge variant="outline">boş</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-4 items-center">
                    {template?.name || (
                      <Badge variant="destructive">bulunamadı</Badge>
                    )}
                    {template?.updatedAt &&
                      template?.updatedAt > cert.updatedAt && (
                        <CertificateRefresh certificate={cert} />
                      )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" className="w-12" asChild>
                            <Link
                              to={`${cert.id}/edit`}
                              aria-label="Sertifikayı düzenle"
                              preventScrollReset
                            >
                              <Settings />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Sertifikayı düzenle
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8">
                            <ChevronDown />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="w-56 -ml-12"
                          align="start"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuItem>
                              <AsyncAction action={`${cert.id}/refresh`}>
                                <button
                                  type="submit"
                                  className="flex flex-col items-start text-left"
                                >
                                  <b>Sertifikayı yenile</b>
                                  <div className="text-sm text-muted-foreground">
                                    Şablon ve değişkenleri güncel değerlere
                                    güncelle.
                                  </div>
                                </button>
                              </AsyncAction>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Button variant="outline" asChild>
                      <Link to={`${cert.id}/preview`}>
                        <Eye /> Önizleme
                      </Link>
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <CertificateSendNotification certificate={cert} />
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
          {templates.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-destructive">
                Henüz PDF şablonu tanımlanmamış. Önce{" "}
                <Link
                  to={`/org/program/${programId}/templates`}
                  className="underline"
                >
                  bir şablon ekle
                </Link>
                .
              </TableCell>
            </TableRow>
          )}
          {certificates.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>Henüz sertifika oluşturulmadı</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Outlet />
    </div>
  );
}
