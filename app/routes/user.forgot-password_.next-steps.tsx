import type { Route } from "./+types/user.forgot-password_.next-steps";
import { redirect } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getUser } from "~/lib/auth.server";
import { getPublicOrg } from "~/lib/organisation.server";

export async function loader({ request }: Route.LoaderArgs) {
	// If there's already a user in the session, redirect to the home page
	const user = await getUser(request);
	if (user) return redirect("/");

	const org = await getPublicOrg();
	return { org };
}

export default function ForgotPasswordNextSteps({
	loaderData,
}: Route.ComponentProps) {
	// @todo use org from root/index
	const { org } = loaderData;

	return (
		<div className="h-screen flex flex-col items-center justify-center px-4 dark:bg-black">
			<div className="grow"></div>

            <img
              src={`/logo/org.svg`}
              alt=""
              className="size-20 dark:invert"
              role="presentation"
            />

			<Card className="mx-auto w-full max-w-sm shadow-none border-none bg-transparent">
				<CardHeader>
					<CardTitle className="text-2xl text-center text-balance">
						Lütfen e-posta kutunu kontrol et.
					</CardTitle>
				</CardHeader>

				<CardContent className="grid gap-4 text-center">
					Girdiğin e-posta adresi burada kayıtlıysa, parolanı
					sıfırlaman için bir bağlantı içeren e-postayı
					göndereceğiz.
				</CardContent>
			</Card>
			<div className="grow flex flex-row justify-center items-end gap-4 pb-5 text-xs">
				{org?.imprintUrl && (
					<a
						href={org.imprintUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						Künye
					</a>
				)}
				{org?.privacyUrl && (
					<a
						href={org.privacyUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						Gizlilik
					</a>
				)}
			</div>
		</div>
	);
}
