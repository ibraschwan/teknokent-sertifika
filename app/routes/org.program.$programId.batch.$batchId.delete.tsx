import type { Route } from "./+types/org.program.$programId.batch.$batchId.delete";

import type { ErrorResponse } from "react-router";
import { useEffect, useRef, useState } from "react";
import {
  redirect,
  useNavigate,
  useRouteError,
  isRouteErrorResponse,
  Form,
  Link,
} from "react-router";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Trash2Icon } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  if (formData.has("confirm") && formData.get("confirm") === "Y") {
    await prisma.batch
      .delete({
        where: {
          id: Number(params.batchId),
          programId: Number(params.programId),
        },
      })
      .catch((error) => {
        console.error(error);
        throwErrorResponse(error, "Dönem silinemedi");
      });
  } else {
    throwErrorResponse(
      new Error("Missing confirmation"),
      "Dönemi gerçekten silmek istiyorsan kutuyu işaretle",
    );
  }

  return redirect(`/org/program/${params.programId}/batch`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const batch = await prisma.batch.findUnique({
    where: {
      id: Number(params.batchId),
      programId: Number(params.programId),
    },
    include: {
      _count: {
        select: { certificates: true },
      },
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

export default function DeleteBatchDialog({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { batch } = loaderData;
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

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
          <DialogTitle>Dönemi sil</DialogTitle>
          <DialogDescription>
            Bu dönemi ve içindeki tüm sertifikaları silmek istediğini
            onaylamak için kutuyu işaretle.
          </DialogDescription>
        </DialogHeader>
        <Form method="POST" ref={formRef} className="flex gap-2 items-center">
          <Checkbox
            id="confirm"
            name="confirm"
            value="Y"
            checked={isConfirmed}
            onCheckedChange={(checked) =>
              setIsConfirmed(checked ? true : false)
            }
          />
          <Label htmlFor="confirm">
            {batch._count.certificates} sertifikayı ve dönemi sil.
          </Label>
        </Form>
        <p className="text-sm text-muted-foreground">
          Sertifikaların silinmesi geri alınamaz. Paylaşılmış sertifikalar
          silindiğinde artık doğrulanamaz.
        </p>
        <DialogFooter className="flex justify-between">
          <Link
            to={`/org/program/${params.programId}/batch/${params.batchId}/certificates`}
          >
            <Button variant="outline">İptal</Button>
          </Link>
          <Button
            onClick={() => formRef.current?.submit()}
            variant="destructive"
            disabled={!isConfirmed}
          >
            <Trash2Icon /> Dönemi sil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error(error);

  let additionalInfo = "";
  if (isRouteErrorResponse(error)) {
    const routeError = error as ErrorResponse;
    if (routeError.statusText.includes("P2003")) {
      additionalInfo =
        " Dönemi silmeden önce lütfen tüm sertifikaları sil.";
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(-2);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(-2);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Hata</DialogTitle>
          <DialogDescription>
            Dönem silinemedi.
            {additionalInfo}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
              navigate(-2);
            }}
          >
            Anladım
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
