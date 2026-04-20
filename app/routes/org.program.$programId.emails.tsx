import type { Route } from "./+types/org.program.$programId.emails";
import { requireAdmin } from "~/lib/auth.server";

export function meta() {
  return [{ title: "E-posta Şablonları" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);

  return {};
}

export default function ProgramEmailsPage() {
  return <div>E-posta Şablonları</div>;
}
