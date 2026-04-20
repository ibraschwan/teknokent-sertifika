import type { Route } from "./+types/user.reset-password.$userId.$resetCode";
import type { Route as RootRoute } from "../+types/root";
import type { ErrorResponse } from "react-router";
import type { UserPasswordReset } from "~/generated/prisma/client";
import type { PasswordAssessment } from "~/components/password-indicator";

import {
	Form,
	redirect,
	useRouteError,
	isRouteErrorResponse,
	useNavigation,
	useRouteLoaderData,
} from "react-router";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";

import { LoaderCircle } from "lucide-react";
import { FormField } from "~/components/form-field";
import {
	PasswordIndicator,
	assessPassword,
} from "~/components/password-indicator";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";

import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { changePassword } from "~/lib/user.server";
import { PasswordSchema as schema } from "~/lib/schemas";

const oneHour = 60 * 60 * 1000;

// Check timestamp of reset code against expiration time
function isTooOld(reset: UserPasswordReset) {
	const oneHourAgo = new Date(Date.now() - oneHour);
	return reset.createdAt < oneHourAgo;
}

export async function action({ request, params }: Route.ActionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema });
	if (submission.status !== "success") {
		return submission.reply();
	}

	if (!params.resetCode) {
		return submission.reply({
			formErrors: ["Sıfırlama kodu eksik."],
		});
	}

	const reset = await prisma.userPasswordReset.findUnique({
		where: {
			resetCode: params.resetCode,
		},
		include: {
			user: true,
		},
	});

	if (!reset) {
		return submission.reply({
			formErrors: ["Parola sıfırlama isteği bulunamadı."],
		});
	}

	if (isTooOld(reset)) {
		// @todo this could be improved by redirecting to /user/forgot-password and showing the error message there
		return submission.reply({
			formErrors: [
				"Bu sıfırlama bağlantısının süresi doldu. Lütfen yeni bir bağlantı iste.",
			],
		});
	}

	await changePassword(reset.user, submission.value.password).catch(
		(error) => {
			console.error(error);
			throwErrorResponse(error, "Yeni parola kaydedilemedi.");
		},
	);

	await prisma.userPasswordReset.delete({
		where: {
			id: reset.id,
		},
	});

	const searchParams = new URLSearchParams([["reset", "done"]]);
	return redirect(`/user/sign/in?${searchParams}`);
}

export async function loader({ params }: Route.LoaderArgs) {
	if (!params.userId) {
		throw new Response(null, {
			status: 400,
			statusText: "Kullanıcı kimliği eksik",
		});
	}
	if (!params.resetCode) {
		throw new Response(null, {
			status: 400,
			statusText: "Sıfırlama kodu eksik",
		});
	}

	const reset = await prisma.userPasswordReset
		.findUnique({
			where: {
				userId: Number(params.userId),
				resetCode: params.resetCode,
			},
		})
		.catch((error) => {
			console.error(error);
			throwErrorResponse(
				error,
				"Bu parola sıfırlama isteği bulunamadı",
			);
		});

	if (!reset) {
		throw new Response(null, {
			status: 404,
			statusText: "Parola sıfırlama isteği bulunamadı",
		});
	}

	if (isTooOld(reset)) {
		// @todo this could be improved by redirecting to /user/forgot-password and showing the error message there
		throw new Response(null, {
			status: 403,
			statusText:
				"Bu sıfırlama bağlantısının süresi doldu. Lütfen yeni bir bağlantı iste.",
		});
	}

	return null;
}

export default function ResetPassword({
	actionData,
	params,
}: Route.ComponentProps) {
	const navigation = useNavigation();
	const { org } =
		useRouteLoaderData<RootRoute.ComponentProps["loaderData"]>("root") ??
		{};

	const [form, fields] = useForm({
		lastResult: actionData,
		constraint: getZodConstraint(schema),
		shouldRevalidate: "onInput",
		onValidate({ formData }) {
			return parseWithZod(formData, {
				schema,
			});
		},
	});

	let passwordStrength: PasswordAssessment | undefined = undefined;
	if (fields.password.value && fields.password.value !== "") {
		passwordStrength = assessPassword(fields.password.value);
	}

	const isSubmitting =
		navigation.formAction ===
		`/user/reset-password/${params.userId}/${params.resetCode}`;

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
					<CardTitle className="text-2xl text-center">
						Parolanı Sıfırla
					</CardTitle>
					<CardDescription className="text-center text-balance">
						Hesabına erişmek için kullanmak istediğin yeni
						parolayı gir.
					</CardDescription>
				</CardHeader>

				<CardContent className="grid gap-4">
					<Form
						method="POST"
						{...getFormProps(form)}
						className="grid gap-4"
					>
						{form.errors && (
							<div
								id={form.errorId}
								className="w-full font-semibold text-sm text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2"
							>
								{form.errors}
							</div>
						)}

						<FormField
							{...getInputProps(fields.password, {
								type: "password",
							})}
							label="Yeni parola"
							error={fields.password.errors?.join(", ")}
						/>

						<Label>Parola gücü</Label>
						<PasswordIndicator
							passwordStrength={passwordStrength?.result}
						/>

						<Button
							type="submit"
							className="w-full"
							disabled={isSubmitting}
						>
							{isSubmitting && (
								<LoaderCircle className="mr-2 animate-spin" />
							)}
							Parolayı Sıfırla
						</Button>
					</Form>
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

export function ErrorBoundary() {
	const error = useRouteError();
	let errorMessage: string;

	if (isRouteErrorResponse(error)) {
		// error is type `ErrorResponse`
		const routeError = error as ErrorResponse;
		errorMessage = routeError.data?.error?.message || routeError.statusText;
	} else if (error instanceof Error) {
		errorMessage = error.message;
	} else if (typeof error === "string") {
		errorMessage = error;
	} else {
		console.error(error);
		errorMessage = "Bilinmeyen hata";
	}

	return (
		<div className="h-screen flex flex-col items-center justify-center px-4 dark:bg-black">
			<div className="grow"></div>

			<img
				src={`/logo/org.svg`}
				alt=""
				className="size-12"
				role="presentation"
			/>

			<Card className="mx-auto max-w-sm shadow-none border-none bg-transparent">
				<CardHeader>
					<CardTitle className="text-2xl text-center">
						Parolanı Sıfırla
					</CardTitle>
				</CardHeader>

				<CardContent className="grid gap-4 text-balance">
					<div className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center text-center gap-2">
						{errorMessage}
					</div>
				</CardContent>
			</Card>
			<div className="grow flex flex-row justify-center items-end gap-4 pb-5 text-xs"></div>
		</div>
	);
}
