import type { Route } from "./+types/org.program.$programId.batch.$batchId.edit";

import { useEffect, useState, useRef } from "react";
import { Form, Link, redirect, useNavigate } from "react-router";

import { Trash2Icon } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Dönemi Düzenle" }];
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };

  await prisma.batch.update({
    where: {
      id: Number(params.batchId),
      programId: Number(params.programId),
    },
    data: {
      name: inputs.name,
      startDate: new Date(inputs.startDate),
      endDate: new Date(inputs.endDate),
    },
  });

  return redirect(`../${params.batchId}/certificates`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const batch = await prisma.batch.findUnique({
    where: {
      id: Number(params.batchId),
      programId: Number(params.programId),
    },
  });

  if (!batch) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return { batch };
}

export default function EditBatchDialog({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { batch } = loaderData;
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const formRef = useRef<HTMLFormElement | null>(null);

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
        <DialogHeader>
          <DialogTitle>Dönem ayarları</DialogTitle>
          <DialogDescription>
            Dönem bilgilerini gerektiği şekilde değiştir. Sonrasında
            sertifikaları yenilemeyi unutma.
          </DialogDescription>
        </DialogHeader>
        <Form method="POST" ref={formRef} className="grid gap-4 py-4">
          <Label htmlFor="name">Ad</Label>
          <Input id="name" name="name" defaultValue={batch.name} />
          <Label htmlFor="startDate">Başlangıç tarihi</Label>
          <Input
            type="date"
            id="startDate"
            name="startDate"
            defaultValue={batch.startDate.toISOString().split("T")[0]}
          />
          <Label htmlFor="endDate">Bitiş tarihi</Label>
          <Input
            type="date"
            id="endDate"
            name="endDate"
            defaultValue={batch.endDate.toISOString().split("T")[0]}
          />
        </Form>
        <DialogFooter className="flex justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={`/org/program/${params.programId}/batch/${params.batchId}/delete`}
              >
                <Button variant="destructive" size="icon">
                  <Trash2Icon />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">Bu dönemi sil</TooltipContent>
          </Tooltip>

          <Button onClick={() => formRef.current?.submit()}>
            Değişiklikleri Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
