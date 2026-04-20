import type { Route } from "./+types/org.program.$programId.templates.$templateId.edit-layout";
import type { ErrorResponse } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useParams,
  useNavigate,
  useNavigation,
  useSubmit,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

import {
  generateTemplateSample,
  generatePreviewOfTemplate,
  sampleQR,
} from "~/lib/pdf.server";

import { ClipboardCopy, ClipboardPaste, ClipboardCheck } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { useToast } from "~/hooks/use-toast";
import { useTemplateHistory } from "~/hooks/use-template-history";
import { useTemplateDraft } from "~/hooks/use-template-draft";
import { EditorShell } from "~/components/editor/editor-shell";
import { EditorCanvas, type Selection } from "~/components/editor/editor-canvas";
import { LayersPanel } from "~/components/editor/editor-layers-panel";
import { PropertiesPanel } from "~/components/editor/editor-properties-panel";
import { EditorStatusBar } from "~/components/editor/editor-status-bar";
import { locales } from "~/lib/template-locales";
import { A4_LANDSCAPE_PT, DEFAULT_QR } from "~/lib/editor-coords";
import { generateRandomId } from "~/lib/utils";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `Şablon ${data?.template?.name}` }];
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };
  let layoutJSON: PrismaJson.TextBlock[];
  let qrJSON: PrismaJson.QRCode;

  // @todo verify schema of incoming JSON
  try {
    layoutJSON = JSON.parse(inputs.layout);
  } catch {
    throw new Response(null, {
      status: 400,
      statusText: "Invalid JSON layout",
    });
  }

  // @todo verify schema of incoming JSON
  try {
    qrJSON = JSON.parse(inputs.qrcode);
  } catch {
    throw new Response(null, {
      status: 400,
      statusText: "Invalid JSON layout",
    });
  }

  // If this email exists already for this batch, update instead of create
  const template = await prisma.template
    .update({
      where: {
        id: Number(params.templateId),
        programId: Number(params.programId),
      },
      data: {
        layout: layoutJSON,
        qrcode: qrJSON,
        name: inputs.name,
        locale: inputs.locale || undefined,
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not update template");
    });

  if (template) {
    await generateTemplateSample(template);
    await generatePreviewOfTemplate(template, false);
  }

  return { template };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
      programId: Number(params.programId),
    },
  });

  if (!template) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  /* Temporarily needed until all templates have QR code settings
     @todo ensure all templates have or get a qrcode settings declaration and then update the schema to make it non-optional
  */
  if (template && template.qrcode === null) {
    template.qrcode = sampleQR;
  }

  const typefaces = await prisma.typeface.findMany();

  return { template, typefaces };
}

export default function TemplateEditorPage({
  loaderData,
}: Route.ComponentProps) {
  const { template, typefaces } = loaderData;
  const navigation = useNavigation();
  const submit = useSubmit();
  const { toast } = useToast();
  const page = A4_LANDSCAPE_PT;

  const initialSnapshot = useMemo(
    () => ({
      layout: template.layout as PrismaJson.TextBlock[],
      qrcode: (template.qrcode ?? DEFAULT_QR) as PrismaJson.QRCode,
    }),
    [template.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const history = useTemplateHistory(initialSnapshot);
  const draft = useTemplateDraft(template.id, initialSnapshot);

  const [selection, setSelection] = useState<Selection>(null);
  const [templateName, setTemplateName] = useState(template.name);
  const [locale, setLocale] = useState(template.locale);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const layout = history.snapshot.layout;
  const qrcode = history.snapshot.qrcode;

  // Reset state if the server-loaded template identity changes
  const prevTemplateId = useRef(template.id);
  useEffect(() => {
    if (prevTemplateId.current !== template.id) {
      prevTemplateId.current = template.id;
      history.reset(initialSnapshot);
      draft.updateBaseline(initialSnapshot);
      setTemplateName(template.name);
      setLocale(template.locale);
      setSelection(null);
    }
  }, [template.id, template.name, template.locale, initialSnapshot, history, draft]);

  // Persist in-progress edits to localStorage
  useEffect(() => {
    draft.save(history.snapshot);
  }, [history.snapshot, draft]);

  // Helpers that dispatch into history
  const setLayoutLive = (next: PrismaJson.TextBlock[]) =>
    history.setLive({ layout: next, qrcode });
  const setQrcodeLive = (next: PrismaJson.QRCode) =>
    history.setLive({ layout, qrcode: next });
  const commit = () => history.commitAs({ layout, qrcode });

  const setLayoutCommit = (next: PrismaJson.TextBlock[]) =>
    history.set({ layout: next, qrcode });
  const setQrcodeCommit = (next: PrismaJson.QRCode) =>
    history.set({ layout, qrcode: next });

  // --- Operations ---

  const addBlock = () => {
    const id = generateRandomId();
    const font = typefaces[0]?.name ?? "DejaVu Sans";
    const newBlock: PrismaJson.TextBlock = {
      id,
      x: Math.round(page.width / 2 - 80),
      y: Math.round(page.height / 2),
      size: 16,
      align: "left",
      lines: [{ id: generateRandomId(), font, text: "Yeni metin" }],
    };
    setLayoutCommit([...layout, newBlock]);
    setSelection({ kind: "block", id });
  };

  const addQr = () => {
    if (qrcode) return;
    const newQr: PrismaJson.QRCode = { ...DEFAULT_QR, show: true };
    setQrcodeCommit(newQr);
    setSelection({ kind: "qr" });
  };

  const deleteBlock = (id: string) => {
    setLayoutCommit(layout.filter((b) => b.id !== id));
    if (selection?.kind === "block" && selection.id === id) setSelection(null);
  };

  const deleteQr = () => {
    // Hide rather than delete: the schema is singleton. We set show=false.
    if (qrcode) setQrcodeCommit({ ...qrcode, show: false });
    setSelection(null);
  };

  const reorderBlock = (from: number, to: number) => {
    const next = [...layout];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLayoutCommit(next);
  };

  const toggleQrVisibility = () => {
    if (!qrcode) return;
    setQrcodeCommit({ ...qrcode, show: !qrcode.show });
  };

  const inlineEditFirstSegmentText = (blockId: string, text: string) => {
    setLayoutCommit(
      layout.map((b) =>
        b.id === blockId
          ? {
              ...b,
              lines: b.lines.length
                ? [{ ...b.lines[0], text }, ...b.lines.slice(1)]
                : [{ id: generateRandomId(), font: typefaces[0]?.name ?? "", text }],
            }
          : b,
      ),
    );
  };

  // --- Clipboard ---

  const clipboardCopy = async () => {
    const fullLayout = {
      mime: "x-teknokent/template-layout",
      layout,
      qrcode,
    };
    await navigator.clipboard.writeText(JSON.stringify(fullLayout, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 500);
  };

  const clipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const decoded = JSON.parse(text);
      if (
        decoded?.mime === "x-teknokent/template-layout" &&
        Array.isArray(decoded.layout) &&
        decoded.qrcode
      ) {
        setLayoutCommit(decoded.layout);
        setQrcodeCommit(decoded.qrcode);
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 500);
        return;
      }
    } catch {
      /* fall through */
    }
    toast({
      title: "🔴 Yerleşim yapıştırılamadı",
      description:
        "Panodan yerleşimi yapıştırmaya çalışırken geçerli bir yerleşim tanımı bulunamadı.",
    });
  };

  // --- Save ---

  const save = () => {
    const fd = new FormData();
    fd.append("layout", JSON.stringify(layout));
    fd.append("qrcode", JSON.stringify(qrcode));
    fd.append("name", templateName);
    fd.append("locale", locale);
    submit(fd, { method: "POST" });
    draft.clear();
  };

  const saving = navigation.state !== "idle";

  // --- Draft restore banner ---
  const hasDraft = !!draft.draft;
  const restoreDraft = () => {
    if (!draft.draft) return;
    history.reset(draft.draft.snapshot);
    draft.clear();
  };

  return (
    <>
      {hasDraft && (
        <div className="flex items-center gap-3 px-4 py-2 mb-3 bg-amber-100 border border-amber-300 rounded-md text-sm">
          <span className="flex-1">
            Kaydedilmemiş bir taslak bulundu. Geri yüklemek ister misin?
          </span>
          <Button size="sm" variant="outline" onClick={restoreDraft}>
            Geri yükle
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => draft.clear()}
          >
            At
          </Button>
        </div>
      )}

      <EditorShell
        header={
          <>
            <div className="font-semibold truncate">{templateName}</div>
            <div className="grow" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={clipboardCopy}>
                  {copySuccess ? <ClipboardCheck className="size-4" /> : <ClipboardCopy className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Yerleşimi kopyala</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={clipboardPaste}>
                  {pasteSuccess ? <ClipboardCheck className="size-4" /> : <ClipboardPaste className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Yerleşimi yapıştır</TooltipContent>
            </Tooltip>
            <Button onClick={save} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Kaydet ve Önizle"}
            </Button>
          </>
        }
        left={
          <LayersPanel
            layout={layout}
            qrcode={qrcode}
            selection={selection}
            onSelect={setSelection}
            onAddBlock={addBlock}
            onAddQr={addQr}
            onDeleteBlock={deleteBlock}
            onToggleQrVisibility={toggleQrVisibility}
            onReorder={reorderBlock}
          />
        }
        canvas={
          <EditorCanvas
            layout={layout}
            qrcode={qrcode}
            previewUrl={`preview.png?t=${template.updatedAt}`}
            previewKey={String(template.updatedAt)}
            selection={selection}
            onSelect={setSelection}
            onLayoutLive={setLayoutLive}
            onQrcodeLive={setQrcodeLive}
            onCommit={commit}
            onInlineEditText={inlineEditFirstSegmentText}
          />
        }
        right={
          <PropertiesPanel
            selection={selection}
            layout={layout}
            qrcode={qrcode}
            typefaces={typefaces}
            onLayoutChange={setLayoutCommit}
            onQrcodeChange={setQrcodeCommit}
            onDeleteBlock={deleteBlock}
            onDeleteQr={deleteQr}
            templateName={templateName}
            onTemplateNameChange={setTemplateName}
            locale={locale}
            onLocaleChange={setLocale}
            locales={locales}
          />
        }
        footer={
          <EditorStatusBar
            selection={selection}
            layout={layout}
            qrcode={qrcode}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={history.undo}
            onRedo={history.redo}
          />
        }
      />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const params = useParams();
  const navigate = useNavigate();
  console.error(error);

  let additionalInfo = "";
  if (isRouteErrorResponse(error)) {
    const routeError = error as ErrorResponse;
    /* if (routeError.statusText) {
      additionalInfo = routeError.statusText;
    } */
    if (routeError.data) {
      additionalInfo = routeError.data;
    }
  }

  const backLink = `/org/program/${params.programId}/templates/${params.templateId}/edit-layout`;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(backLink);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate, backLink]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(backLink);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Hata</DialogTitle>
          <DialogDescription>
            Şablon kaydedilemedi.
            <br />
            {additionalInfo}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
              navigate(backLink);
            }}
          >
            Anladım
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
