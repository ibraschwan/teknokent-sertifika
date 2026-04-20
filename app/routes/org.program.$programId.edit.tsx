import type { Route } from "./+types/org.program.$programId.edit";
import type { ActionFunction } from "react-router";
import { useEffect, useState, useRef } from "react";
import { Form, redirect, useNavigate } from "react-router";

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
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Programı Düzenle" }];
}

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };

  await prisma.program.update({
    where: {
      id: Number(params.programId),
    },
    data: {
      name: inputs.name,
      achievement: inputs.achievement,
      about: inputs.about,
      website: inputs.website,
    },
  });

  return redirect(`/org/program`);
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
  });

  if (!program) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return { program };
}

export default function EditBatchDialog({ loaderData }: Route.ComponentProps) {
  const { program } = loaderData;
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
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Program ayarları</DialogTitle>
          <DialogDescription>
            Program bilgilerini gerektiği gibi değiştir.
          </DialogDescription>
        </DialogHeader>
        <Form method="POST" ref={formRef}>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">Ad</Label>
            <Input id="name" name="name" defaultValue={program.name} />

            <Label htmlFor="achievement">Başarı</Label>
            <Textarea
              id="achievement"
              name="achievement"
              defaultValue={program.achievement ?? ""}
            />

            <Label htmlFor="about">Program hakkında</Label>
            <Textarea
              id="about"
              name="about"
              defaultValue={program.about ?? ""}
              rows={6}
            />

            <Label htmlFor="website">Web sitesi</Label>
            <Input
              id="website"
              name="website"
              defaultValue={program.website ?? ""}
              placeholder="https://"
            />
          </div>
        </Form>
        <DialogFooter>
          <Form action={`../delete`} method="POST" className="flex grow">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" variant="destructive" size="icon">
                  <Trash2Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Bu programı sil</TooltipContent>
            </Tooltip>
          </Form>
          <Button onClick={() => formRef.current?.submit()}>
            Değişiklikleri Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
