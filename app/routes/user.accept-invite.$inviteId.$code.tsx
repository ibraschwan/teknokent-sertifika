import type { Route } from "./+types/user.accept-invite.$inviteId.$code";
import type { PasswordAssessment } from "~/components/password-indicator";
import bcrypt from "bcryptjs";
import { useState } from "react";
import { Form, data } from "react-router";
import { Layout } from "~/components/layout";

import {
	PasswordIndicator,
	assessPassword,
} from "~/components/password-indicator";

import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardFooter,
	CardTitle,
} from "~/components/ui/card";

import { createUserSessionAndRedirect } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getPublicOrg } from "~/lib/organisation.server";

export async function action({ request, params }: Route.ActionArgs) {
	if (params.inviteId && params.code) {
		const invite = await prisma.userInvitation.findUnique({
			where: {
				id: Number(params.inviteId),
				verifyCode: params.code,
			},
		});

		if (!invite) {
			throw new Response(null, {
				status: 400,
				statusText: "Kod doğrulanamadı.",
			});
		}

		const formData = await request.formData();
		const inputs = Object.fromEntries(formData) as { [k: string]: string };

		const strength = assessPassword(inputs.password);
		if (!strength.enough) {
			return data(
				{ error: "Lütfen daha güçlü bir parola seç." },
				{ status: 400 },
			);
		}

		const passwordHash = await bcrypt.hash(inputs.password, 10);

		// @todo add access control for valid programs of invite sender

		const setAdminOfPrograms = invite.adminOfPrograms
			? invite.adminOfPrograms.map((pId) => ({ id: pId }))
			: [];

		const user = await prisma.user.upsert({
			where: {
				email: invite.email,
			},
			update: {
				isAdmin: invite.isAdmin,
				password: passwordHash,
				adminOfPrograms: { set: setAdminOfPrograms },
			},
			create: {
				firstName: invite.firstName,
				lastName: invite.lastName,
				email: invite.email,
				password: passwordHash,
				verifyCode: invite.verifyCode,
				isAdmin: invite.isAdmin,
				adminOfPrograms: { connect: setAdminOfPrograms },
				isVerified: true,
			},
			include: {
				adminOfPrograms: true,
				photo: true,
			},
		});

		if (user) {
			// @todo instead of deleting it, mark it as used and give user feedback when the link is clicked again
			// @todo clean up the used invite codes after a certain time period
			await prisma.userInvitation.delete({
				where: {
					id: Number(params.inviteId),
				},
			});
		}

		return createUserSessionAndRedirect(
			user,
			user.isAdmin ? "/org/program" : "/",
		);
	}

	// Got here?
	throw new Response(null, {
		status: 400,
		statusText: "Could not verify the code.",
	});
}

export async function loader({ params }: Route.LoaderArgs) {
	if (params.inviteId && params.code) {
		const invite = await prisma.userInvitation.findUnique({
			where: {
				id: Number(params.inviteId),
				verifyCode: params.code,
			},
			select: {
				email: true,
			},
		});

		if (!invite) {
			throw new Response(null, {
				status: 404,
				statusText: "Davet bulunamadı",
			});
		}

		const org = await getPublicOrg();
		return { invite, org };
	}

	// Got here?
	throw new Response(null, {
		status: 404,
		statusText: "Invite not found",
	});
}

export default function AcceptInvitationPage({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { invite, org } = loaderData;
	const [password, setPassword] = useState("");

	const formError = actionData?.error;

	let passwordStrength: PasswordAssessment | undefined = undefined;
	let passwordStrengthEnough = false;

	if (password !== "") {
		passwordStrength = assessPassword(password);
		passwordStrengthEnough = passwordStrength.enough;
	}

	return (
		<Layout type="modal">
			<img
				src={`/logo/org.svg`}
				alt=""
				className="size-20 dark:invert"
				role="presentation"
			/>

			<Card className="mx-auto max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl">
						Daveti Kabul Et
					</CardTitle>
					<CardDescription>
						Daveti kabul etmek ve kaydını tamamlamak için, lütfen
						hesabın için kullanmak istediğin bir parola belirle.
					</CardDescription>
				</CardHeader>

				<Form method="POST">
					<CardContent className="grid gap-4">
						{formError && (
							<div className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2">
								{formError}
							</div>
						)}
						<Label>E-posta</Label>
						<Input disabled defaultValue={invite.email} />
						<Label htmlFor="password">Parola</Label>
						<Input
							id="password"
							name="password"
							type="password"
							onChange={(event) => {
								setPassword(event.target.value);
							}}
						/>
						<Label>
							Parola gücü
							<PasswordIndicator
								passwordStrength={passwordStrength?.result}
							/>
						</Label>
					</CardContent>
					<CardFooter>
						<Button
							type="submit"
							className="w-full"
							disabled={!passwordStrengthEnough}
						>
							Daveti Kabul Et
						</Button>
					</CardFooter>
				</Form>
			</Card>
			<div className="text-xs grow flex flex-row items-end pb-12">
				{org?.name}&emsp;&middot;&emsp;
				<a href={org?.imprintUrl ?? ""}>Künye</a>&emsp;&middot;&emsp;
				<a href={org?.privacyUrl ?? ""}>Gizlilik</a>
			</div>
		</Layout>
	);
}
