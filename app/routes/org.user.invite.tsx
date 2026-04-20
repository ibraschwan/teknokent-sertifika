import type { Route } from "./+types/org.user.invite";
import type { Program } from "~/generated/prisma/client";
import { useEffect, useState } from "react";
import { Form, redirect, useNavigate } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MultiSelect } from "~/components/ui/multi-select";

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getProgramsByAdmin } from "~/lib/program.server";
import { createUserInvitation } from "~/lib/user.server";

export function meta() {
  return [{ title: "Yönetici Davet Et" }];
}

export async function action({ request }: Route.ActionArgs) {
  const adminId = await requireSuperAdmin(request);
  const admin = await prisma.user.findUnique({ where: { id: adminId } });

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };

  // @todo add form validation

  // @todo add access control

  await createUserInvitation(
    {
      firstName: inputs.firstName,
      lastName: inputs.lastName,
      email: inputs.email,
      adminOfPrograms: inputs.adminOfPrograms
        ? inputs.adminOfPrograms.split(",").map((pId: string) => Number(pId))
        : undefined,
    },
    admin,
  );

  return redirect(`/org/user`);
}

export async function loader({ request }: Route.LoaderArgs) {
  const adminId = await requireSuperAdmin(request);
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
    select: {
      id: true,
      isAdmin: true,
      isSuperAdmin: true,
      adminOfPrograms: true,
    },
  });

  const programs = await getProgramsByAdmin(adminId);

  return { admin, programs };
}

export default function InviteAdminDialog({
  loaderData,
}: Route.ComponentProps) {
  const { programs } = loaderData;
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const programList = programs.map((p: Program) => {
    return { value: p.id.toString(), label: p.name };
  });

  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[625px]">
        <Form method="POST">
          <DialogHeader>
            <DialogTitle>Yönetici davet et</DialogTitle>
            <DialogDescription>
              Burada birini bu kurumun yöneticisi olması için davet
              edebilirsin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="firstName">Ad</Label>
            <Input id="firstName" name="firstName" />
            <Label htmlFor="lastName">Soyad</Label>
            <Input id="lastName" name="lastName" />
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" name="email" type="email" />
          </div>

          {/* @todo add selection of programs for permissions grants (also add to prisma spec) */}
          <Label className="flex flex-col flex-1 leading-6 mb-1">
            Program erişimi
            <span className="text-muted-foreground font-normal">
              Lütfen yönetebilecekleri programları seç
            </span>
          </Label>
          <MultiSelect
            options={programList}
            onValueChange={setSelectedPrograms}
            defaultValue={selectedPrograms}
            placeholder="Program seç"
            variant="inverted"
            animation={0}
            maxCount={3}
          />
          <input
            type="hidden"
            name="adminOfPrograms"
            value={selectedPrograms.join(",")}
          />

          <DialogFooter className="pt-4">
            <Button type="submit">Daveti Gönder</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
