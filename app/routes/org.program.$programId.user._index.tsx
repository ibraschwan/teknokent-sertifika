import type { Route } from "./+types/org.program.$programId.user._index";
import { Form, Link, useRouteLoaderData, useSearchParams } from "react-router";
import { ArrowDown, UserPlus, UserX, MailX } from "lucide-react";
import { Button } from "~/components/ui/button";

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

export function meta() {
  return [{ title: "Program Kullanıcısı" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, Number(params.programId));

  const user = await prisma.user.findMany({
    where: {
      OR: [
        { isSuperAdmin: true },
        {
          isAdmin: true,
          adminOfPrograms: {
            some: {
              id: programId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isAdmin: true,
      isSuperAdmin: true,
    },
    orderBy: {
      firstName: "asc",
    },
  });
  const invitations = await prisma.userInvitation.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return { user, invitations };
}

export default function UserIndexPage({ loaderData }: Route.ComponentProps) {
  const { user, invitations } = loaderData;
  // @todo typesafe use of useRouteLoaderData
  const { program } = useRouteLoaderData("routes/org.program.$programId");
  const [searchParams, setSearchParams] = useSearchParams();

  let sortedUser = user;
  if (searchParams.has("sort")) {
    switch (searchParams.get("sort")) {
      case "name":
        sortedUser = user.toSorted((a, b) => {
          if (a.firstName < b.firstName) {
            return -1;
          }
          if (a.firstName > b.firstName) {
            return 1;
          }
          return 0;
        });
        break;
      case "email":
        sortedUser = user.toSorted((a, b) => {
          if (a.email < b.email) {
            return -1;
          }
          if (a.email > b.email) {
            return 1;
          }
          return 0;
        });
        break;
      case "permission":
        sortedUser = user.toSorted((a, b) => {
          if (a.isSuperAdmin && !b.isSuperAdmin) {
            return -1;
          }
          if (!a.isAdmin && b.isAdmin) {
            return 1;
          }
          if (a.isAdmin && !b.isAdmin) {
            return -1;
          }
          if (!a.isSuperAdmin && b.isSuperAdmin) {
            return 1;
          }
          return 0;
        });
        break;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button asChild>
          <Link to="invite">
            <UserPlus strokeWidth={3} />
            Program Yöneticisi Davet Et
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Aşağıdaki kişiler {program.name} için sertifikaları ve ayarları
        yönetebilir.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("sort", "name");
                  setSearchParams(params, {
                    preventScrollReset: true,
                  });
                }}
              >
                Ad Soyad {searchParams.get("sort") === "name" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead className="font-medium">
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("sort", "email");
                  setSearchParams(params, {
                    preventScrollReset: true,
                  });
                }}
              >
                E-posta {searchParams.get("sort") === "email" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("sort", "permission");
                  setSearchParams(params, {
                    preventScrollReset: true,
                  });
                }}
              >
                İzinler{" "}
                {searchParams.get("sort") === "permission" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invite) => (
            <TableRow key={invite.id} className="text-muted-foreground">
              <TableCell>
                {invite.firstName} {invite.lastName}
              </TableCell>
              <TableCell className="font-medium">{invite.email}</TableCell>
              <TableCell>Davet bekleniyor…</TableCell>
              <TableCell className="text-foreground">
                <Form action={`invite/${invite.id}/delete`} method="POST">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">
                        <MailX /> İptal
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Daveti iptal et
                    </TooltipContent>
                  </Tooltip>
                </Form>
              </TableCell>
            </TableRow>
          ))}
          {sortedUser.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                {u.firstName} {u.lastName}
              </TableCell>
              <TableCell className="font-medium">{u.email}</TableCell>
              <TableCell>
                {u.isSuperAdmin
                  ? "Süper Yönetici"
                  : u.isAdmin
                  ? "Program Yöneticisi"
                  : "Sertifikaları Görüntüle"}
              </TableCell>
              <TableCell>
                {!u.isSuperAdmin && (
                  <Form action={`${u.id}/remove`} method="POST">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="submit"
                          variant="outline"
                          aria-label="Program yöneticisi izinlerini kaldır"
                        >
                          <UserX /> Kaldır
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Erişimi kaldır</TooltipContent>
                    </Tooltip>
                  </Form>
                )}
              </TableCell>
            </TableRow>
          ))}
          {user.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-destructive">
                Veritabanında kullanıcı yok.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
