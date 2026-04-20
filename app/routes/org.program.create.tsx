import type { Route } from "./+types/org.program.create";
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

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  const title = `Program Ekle`;
  return [{ title }, { name: "description", content: "Welcome to Remix!" }];
}

export async function action({ request }: Route.ActionArgs) {
  const adminId = await requireAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };

  // @todo add form validation and error handling

  const program = await prisma.program.create({
    data: {
      name: inputs.name,
      admins: {
        connect: {
          id: adminId,
        },
      },
    },
  });

  return redirect(`/org/program/${program.id}/settings`);
}

export default function CreateProgramDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

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
      <DialogContent className="sm:max-w-[425px]">
        <Form method="POST">
          <DialogHeader>
            <DialogTitle>Program ekle</DialogTitle>
            <DialogDescription>
              Bu kurum için yeni bir program oluştur.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">Ad</Label>
            <Input id="name" name="name" />
          </div>
          <DialogFooter>
            <Button type="submit">Programı Kaydet</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
