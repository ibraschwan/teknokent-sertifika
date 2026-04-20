import type { Route } from "./+types/org.user._index";
import { Form, Link, useSearchParams } from "react-router";
import { ArrowDown, Settings, Trash2Icon } from "lucide-react";
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

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Kullanıcı" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);

  const user = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isAdmin: true,
      isSuperAdmin: true,
      adminOfPrograms: true,
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

  // @todo prevent sorting from triggering a new data fetch (probably by implementing a clientLoader)
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

  const onSetSort = (propName: string) => {
    const params = new URLSearchParams();
    params.set("sort", propName);
    setSearchParams(params, {
      preventScrollReset: true,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button asChild>
          <Link to="invite">Yönetici Davet Et</Link>
        </Button>
      </div>
      <Table>
        <colgroup>
          <col width="20%" />
          <col width="20%" />
          <col width="40%" />
          <col />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => onSetSort("name")}
              >
                Ad Soyad {searchParams.get("sort") === "name" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead className="font-medium">
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => onSetSort("email")}
              >
                E-posta {searchParams.get("sort") === "email" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => onSetSort("permission")}
              >
                İzinler{" "}
                {searchParams.get("sort") === "permission" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead>İşlemler</TableHead>
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
                        <Trash2Icon /> İptal
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
              <TableCell className="align-top py-4">
                {u.firstName} {u.lastName}
              </TableCell>
              <TableCell className="align-top py-4 font-medium">
                {u.email}
              </TableCell>
              <TableCell className="align-top py-4">
                {u.isSuperAdmin ? (
                  "Süper Yönetici"
                ) : u.isAdmin ? (
                  <>
                    <b>Program Yöneticisi</b>:{" "}
                    {u.adminOfPrograms.map((p) => p.name).join(", ")}
                  </>
                ) : (
                  "Sertifikaları Görüntüle"
                )}
              </TableCell>
              <TableCell>
                {/* @todo show edit only if permissions are there / show this view only to super-admins, create a separate user view per program? */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" asChild>
                      <Link to={`${u.id}/edit`} aria-label="Kullanıcı ayarlarını düzenle">
                        <Settings /> Düzenle
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Kullanıcı ayarlarını düzenle</TooltipContent>
                </Tooltip>
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
