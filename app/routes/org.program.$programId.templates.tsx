import type { Route } from "./+types/org.program.$programId.templates";
import type { Template } from "~/generated/prisma/client";
import { useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router";

import { Settings } from "lucide-react";

import { Button } from "~/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.program?.name} Şablonları` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request); // program access is managed at the parent route

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
    include: {
      templates: {
        orderBy: {
          name: "asc",
        },
      },
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

export default function ProgramTemplatesPage({
  loaderData,
  params,
  matches,
}: Route.ComponentProps) {
  const { program } = loaderData;
  const navigate = useNavigate();

  const firstTemplate =
    program.templates.length > 0 ? program.templates[0] : undefined;

  const handleTemplateSelect = (value: string) => {
    navigate(`/org/program/${program.id}/templates/${value}/edit-layout`);
  };

  useEffect(() => {
    // IF at least one template exists AND we're on program level THEN navigate to the first template
    if (firstTemplate && matches.length === 4) {
      navigate(
        `/org/program/${program.id}/templates/${firstTemplate.id}/edit-layout`,
        {
          replace: true,
        },
      );
    }
  }, [program.id, matches, firstTemplate, navigate]);

  // @todo reduce layout shifts by setting a size (or aspect ratio?) for the preview image and/or the layout

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        {program.templates.length > 0 && (
          <Select
            key={params.templateId}
            defaultValue={params.templateId}
            onValueChange={handleTemplateSelect}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Bir şablon seç" />
            </SelectTrigger>
            <SelectContent>
              {program.templates.map((template: Template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {params.templateId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" asChild>
                <Link
                  to={`${params.templateId}/edit-meta`}
                  aria-label="Şablon ayarlarını düzenle"
                >
                  <Settings />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Şablon ayarlarını düzenle</TooltipContent>
          </Tooltip>
        )}

        {params.templateId && (
          <Button variant="outline" asChild>
            <Link to={`${params.templateId}/duplicate`}>
              Şablonu çoğalt
            </Link>
          </Button>
        )}

        <Button variant="outline" asChild>
          <Link to="create">Şablon ekle</Link>
        </Button>
      </div>

      {program.templates.length === 0 && (
        <p>
          Sertifikalar PDF şablonlarına dayanır. İlk PDF şablonunu yükleyerek
          başla.
        </p>
      )}

      <Outlet />
    </div>
  );
}
