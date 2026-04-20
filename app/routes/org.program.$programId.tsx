import type { Route } from "./+types/org.program.$programId";
import type { ErrorResponse } from "react-router";

import { Outlet, isRouteErrorResponse, useRouteError } from "react-router";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.program?.name}` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
    include: {
      batches: true,
      logo: true,
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

// @todo add a program index page with an overview?

export default function ProgramPage() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorInfo;

  if (isRouteErrorResponse(error)) {
    const response = error as ErrorResponse;
    errorInfo = (
      <div>
        <h1>
          {response.status} {response.statusText}
        </h1>
        <p>{response.data}</p>
      </div>
    );
  } else if (error instanceof Error) {
    errorInfo = (
      <div>
        <h1>Hata</h1>
        <p>{error.message}</p>
      </div>
    );
  } else {
    errorInfo = <h1>Bilinmeyen Hata</h1>;
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center px-4">
      {errorInfo}
    </div>
  );
}
