import type { Route } from "./+types/user.verify.$userId.$code";

import { redirect } from "react-router";
import { Layout } from "~/components/layout";
import { prisma } from "~/lib/prisma.server";

export async function loader({ params }: Route.LoaderArgs) {
	if (params.userId && params.code) {
		let user = await prisma.user.findUnique({
			where: {
				id: Number(params.userId),
				verifyCode: params.code,
			},
		});

		if (!user) {
			throw new Response(null, {
				status: 400,
				statusText: "Kod doğrulanamadı.",
			});
		}

		if (user) {
			user = await prisma.user.update({
				where: {
					id: user.id,
				},
				data: {
					isVerified: true,
				},
			});

			const searchParams = new URLSearchParams([
				["verification", "done"],
			]);
			throw redirect(`/user/sign/in?${searchParams}`);
		}
	}

	// @todo create a one-time-password for the verification process and start a logged-in user session immediately

	// Got here?
	throw new Response(null, {
		status: 400,
		statusText: "Could not verify the code.",
	});
}

export default function VerifyUserPage() {
	return <Layout type="modal">Seni burada beklemiyorduk.</Layout>;
}
