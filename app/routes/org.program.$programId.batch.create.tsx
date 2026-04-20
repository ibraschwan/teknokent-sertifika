import type { Route } from "./+types/org.program.$programId.batch.create";
import { useEffect, useState, useRef } from "react";
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

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Dönem Ekle" }];
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };

  // @todo add form validation

  const batch = await prisma.batch.create({
    data: {
      name: inputs.name,
      startDate: new Date(inputs.startDate),
      endDate: new Date(inputs.endDate),
      program: {
        connect: {
          id: Number(params.programId),
        },
      },
    },
  });

  return redirect(`../${batch.id}/import`);
}

export default function CreateBatchDialog() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [formIsValid, setFormIsValid] = useState(false);
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
        <Form
          method="POST"
          ref={formRef}
          onChange={() => {
            formRef.current && setFormIsValid(formRef.current.checkValidity());
          }}
        >
          <DialogHeader>
            <DialogTitle>Dönem ekle</DialogTitle>
            <DialogDescription>
              Bu program için yeni bir dönem oluştur
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">Ad</Label>
            <Input id="name" name="name" required />
            <Label htmlFor="startDate">Başlangıç tarihi</Label>
            <Input type="date" id="startDate" name="startDate" required />
            <Label htmlFor="endDate">Bitiş tarihi</Label>
            <Input type="date" id="endDate" name="endDate" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!formIsValid}>
              Dönemi Kaydet
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
