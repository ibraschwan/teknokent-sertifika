import type { Route } from "./+types/user.verification.resend";
import {
	isRouteErrorResponse,
	redirect,
	useRouteError,
	type ErrorResponse,
} from "react-router";
import { prisma } from "~/lib/prisma.server";
import { sendVerificationEmail } from "~/lib/user.server";
import { validateEmail } from "~/lib/validators.server";

// @todo refactor to Conform and Zod schemas

export async function action({ request }: Route.ActionArgs) {
	const form = await request.formData();
	const email = form.get("email") as string;
	const emailError = validateEmail(email);

	if (emailError) {
		return new Response(null, {
			status: 400,
			statusText: emailError,
		});
	}

	const user = await prisma.user.findUnique({
		where: {
			email: email.toLowerCase(),
		},
	});

	if (!user) {
		throw new Response(null, {
			status: 404,
			statusText: "Bu e-posta ile kullanıcı bulunamadı.",
		});
	}

	if (user.isVerified) {
		return redirect("/user/sign/in");
	} else {
		await sendVerificationEmail(user);
		return redirect("/user/verification-info");
	}
}

export async function loader() {
	return redirect("/user/sign/in");
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
