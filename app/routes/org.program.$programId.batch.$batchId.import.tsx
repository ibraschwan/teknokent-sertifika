import type { Route } from "./+types/org.program.$programId.batch.$batchId.import";
import type { Template } from "~/generated/prisma/client";

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  CircleFadingPlus,
  CircleFadingArrowUp,
  CircleCheckBig,
  TriangleAlert,
  ArrowDown,
} from "lucide-react";

import { ToastAction } from "~/components/ui/toast";
import { useToast } from "~/hooks/use-toast";

import { CSVDropZone } from "~/components/csv-drop-zone";
import { TaskRunner } from "~/components/task-runner";

import { Badge } from "~/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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
  return [{ title: "Katılımcıları İçe Aktar" }];
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

  return { batch, templates };
}

function StatusIndicator({ status, error }: { status: string; error: string }) {
  switch (status) {
    case "todo":
      return <CircleFadingPlus color="hsl(var(--muted-foreground))" />;
    case "pending":
      return <CircleFadingArrowUp />;
    case "done":
      return <CircleCheckBig color="green" />;
    case "error":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <TriangleAlert color="orange" />
          </TooltipTrigger>
          <TooltipContent side="top">{error}</TooltipContent>
        </Tooltip>
      );
  }
  return <></>;
}

export default function ImportBatchPage({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { templates } = loaderData;
  const navigate = useNavigate();
  const [key, setKey] = useState(1);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const { toast } = useToast();

  const firstTemplate: Template | null =
    templates && templates.length > 0 ? templates[0] : null;

  const handleCSVRead = (rows: Array<Record<string, string>>) => {
    // If a template column is in the CSV, try to match the template name
    const rowsWithMeta = rows.map((row) => {
      row._status = "todo";
      if (row.template) {
        const matchingTemplate = templates.find((tpl: Template) => {
          return tpl.name.toLowerCase() === row.template.toLowerCase();
        });
        row._template = String(matchingTemplate?.id || firstTemplate?.id);
      } else {
        row._template = String(firstTemplate?.id);
      }
      return row;
    });
    setRows(rowsWithMeta);
    setKey(key + 1);
  };

  const setRowStatus = (index: number, status: string, error = "") => {
    setRows((rows) => {
      const update = [...rows];
      update[index]._status = status;
      if (status === "error") {
        update[index]._error = error;
      }
      return update;
    });
  };

  const setRowTemplate = (index: number, template: string) => {
    setRows((rows) => {
      const update = [...rows];
      update[index]._template = template;
      return update;
    });
  };

  const handleImport = async (item: Record<string, string>, index: number) => {
    setRowStatus(index, "pending");

    const formData = new FormData();
    formData.append("firstName", item.firstname);
    formData.append("lastName", item.lastname);
    formData.append("team", item.team || "");
    formData.append("email", item.email);
    formData.append("templateId", item._template);
    formData.append("batchId", params.batchId);

    await fetch("/cert/import", {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`${response.statusText}`, {
            cause: response,
          });
        }
      })
      .then((/*certificate*/) => {
        setRowStatus(index, "done");
      })
      .catch((error) => {
        setRowStatus(index, "error", error.message);
      });
  };

  const handleReset = () => {
    setRows((rows) => {
      const update = rows.map((row) => {
        return { ...row, _status: "todo", error: "" };
      });
      return update;
    });
  };

  const handleFinished = () =>
    toast({
      title: "İçe aktarma tamamlandı",
      description: "Tüm katılımcılar içe aktarıldı.",
      action: (
        <ToastAction
          altText="Artık sertifika listesine gidebilirsin."
          onClick={() => navigate(`../${params.batchId}/certificates`)}
        >
          Sertifikaları Göster
        </ToastAction>
      ),
    });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Birden fazla katılımcıyı birlikte içe aktarmak için bu dönemin
        katılımcı listesini Google E-Tablolar, Excel, Numbers veya benzeri bir
        araçla CSV dosyası olarak hazırla. Zorunlu sütunları eklemeyi unutma:{" "}
        <i>firstname, lastname, email</i>
        .&ensp;
        <a
          href="/assets/import-example.csv"
          className="inline-flex items-center text-foreground font-medium underline"
        >
          CSV şablonunu indir
          <ArrowDown className="w-4 h-4" />
        </a>
      </p>

      <CSVDropZone onData={handleCSVRead} />

      <TaskRunner
        items={rows}
        itemLabel="katılımcı"
        startLabel="İçe Aktarmayı Başlat"
        pauseLabel="İçe Aktarmayı Duraklat"
        confirmTitle="İçe aktarmayı başlatmak ister misin?"
        confirmDescription="CSV dosyasındaki katılımcılar seçilen döneme eklenecek. Verilen bir e-posta bu dönemde zaten varsa, yinelenmelerin önüne geçmek için ad ve diğer bilgiler güncellenecektir."
        onRunTask={handleImport}
        onReset={handleReset}
        onFinish={handleFinished}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Ad*</TableHead>
            <TableHead>Soyad*</TableHead>
            <TableHead className="font-medium">E-posta*</TableHead>
            <TableHead>Takım</TableHead>
            <TableHead>Şablon</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: Record<string, string>, index: number) => (
            <TableRow key={row.email}>
              <TableCell>
                <StatusIndicator status={row._status} error={row._error} />
              </TableCell>
              <TableCell>
                {row.firstname || (
                  <Badge variant="destructive">firstname</Badge>
                )}
              </TableCell>
              <TableCell>
                {row.lastname || <Badge variant="destructive">lastname</Badge>}
              </TableCell>
              <TableCell className="font-medium">
                {row.email || <Badge variant="destructive">email</Badge>}
              </TableCell>
              <TableCell>
                {row.team || <Badge variant="outline">boş</Badge>}
              </TableCell>
              <TableCell>
                <Select
                  name="template"
                  value={row._template}
                  onValueChange={(value) => {
                    setRowTemplate(index, value);
                  }}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Şablon" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template: Template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id.toString()}
                      >
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {templates.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-destructive">
                Henüz sertifika şablonu tanımlanmamış. Önce{" "}
                <Link
                  to={`/org/program/${params.programId}/templates`}
                  className="underline"
                >
                  bir şablon ekle
                </Link>
                .
              </TableCell>
            </TableRow>
          )}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                İçe aktarılacak katılımcı yok. Önce bir CSV dosyası seç.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
