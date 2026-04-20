import type { User } from "~/generated/prisma/client";
import type { UserAuthenticated } from "./types";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { redirect, createCookieSessionStorage } from "react-router";
import { Authenticator } from "remix-auth";
import { parseWithZod } from "@conform-to/zod/v4";

import { GoogleStrategy } from "./auth.google.server";
import { domain } from "./config.server";
import { sendEmail } from "./email.server";
import { prisma, throwErrorResponse } from "./prisma.server";
import { requireAccessToProgram } from "./program.server";
import { createUser, createUserOAuth } from "./user.server";
import { getOrg } from "./organisation.server";
import { LoginSchema, RegisterSchema } from "./schemas";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
	throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
	cookie: {
		name: "sir-sess",
		secure: process.env.NODE_ENV === "production",
		secrets: [sessionSecret],
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 30,
		httpOnly: true,
	},
});

export const googleLoginIsConfigured: boolean =
	process.env.GOOGLE_LOGIN_CLIENT_ID && process.env.GOOGLE_LOGIN_CLIENT_SECRET
		? true
		: false;

const googleStrategy = new GoogleStrategy(
	{
		clientId: process.env.GOOGLE_LOGIN_CLIENT_ID ?? "MISSING CLIENT ID",
		clientSecret:
			process.env.GOOGLE_LOGIN_CLIENT_SECRET ?? "MISSING CLIENT SECRET",
		redirectURI: `${domain}/auth/google/callback`,
	},
	async ({ tokens }) => {
		// Get the user data from your DB or API using the tokens and profile
		const profile = await GoogleStrategy.userProfile(tokens);
		const user = await getUserByEmail(profile.emails[0].value);
		if (user !== null) {
			return user;
		}
		return createUserOAuth(
			{
				email: profile.emails[0].value,
				firstName: profile.name.givenName,
				lastName: profile.name.familyName,
			},
			"google",
		);
	},
);

export const authenticator = new Authenticator<UserAuthenticated>();
if (googleLoginIsConfigured) {
	authenticator.use(googleStrategy);
}

function getUserSession(request: Request) {
	return storage.getSession(request.headers.get("Cookie"));
}

async function getUserId(request: Request) {
	const session = await getUserSession(request);
	const userId = session.get("userId");
	if (!userId || typeof userId !== "number") return null;
	return userId;
}

export async function register(formData: FormData) {
	const submission = parseWithZod(formData, { schema: RegisterSchema });

	if (submission.status !== "success") {
		return submission.reply();
	}

	const exists = await prisma.user.count({
		where: { email: submission.value.email },
	});

	if (exists) {
		return submission.reply({
			formErrors: ["This email is already registered as a user."],
		});
	}

	const newUser = await createUser(submission.value);

	if (!newUser) {
		return submission.reply({
			formErrors: ["Something went wrong trying to create a new user."],
		});
	}

	return redirect("/user/verification-info");
}

export async function login(formData: FormData) {
	const submission = parseWithZod(formData, { schema: LoginSchema });

	if (submission.status !== "success") {
		return submission.reply();
	}

	const { email, password } = submission.value;

	const user = await prisma.user.findUnique({
		where: { email: email.toLowerCase() },
		include: {
			adminOfPrograms: true,
			photo: true,
		},
	});

	if (!user || !(await bcrypt.compare(password, user.password))) {
		return submission.reply({
			formErrors: ["Incorrect login."],
		});
	}

	if (!user.isVerified) {
		return submission.reply({
			fieldErrors: {
				"verify-email": [
					"You still need to confirm your email address.",
				],
			},
		});
	}

	// @todo support redirectTo parameter from login form
	const redirectTo = user.isAdmin ? "/org/program" : "/";
	return createUserSessionAndRedirect(user, redirectTo);
}

export async function createUserSessionAndRedirect(
	user: UserAuthenticated, // @todo reduce required User properties and remove db query includes above
	redirectTo: string,
) {
	const session = await storage.getSession();
	session.set("userId", user.id);
	session.set("isAdmin", user.isAdmin);
	return redirect(redirectTo, {
		headers: {
			"Set-Cookie": await storage.commitSession(session),
		},
	});
}

export async function requireUserId(
	request: Request,
	redirectTo: string = new URL(request.url).pathname,
) {
	const session = await getUserSession(request);
	const userId = session.get("userId");

	if (!userId || typeof userId !== "number") {
		if (redirectTo !== "/") {
			const searchParams = new URLSearchParams([
				["redirectTo", redirectTo],
			]);
			throw redirect(`/user/sign/in?${searchParams}`);
		} else {
			throw redirect("/user/sign/in");
		}
	}
	return userId;
}

export async function requireAdmin(
	request: Request,
	redirectTo: string = new URL(request.url).pathname,
) {
	const session = await getUserSession(request);
	const userId = session.get("userId");

	if (!userId || typeof userId !== "number") {
		const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
		throw redirect(`/user/sign/in?${searchParams}`);
	}

	const isAdmin = session.get("isAdmin");
	if (!isAdmin) {
		throw new Response(null, {
			status: 403,
			statusText: "You are not allowed access here.",
		});
	}
	return userId;
}

export async function requireSuperAdmin(
	request: Request,
	redirectTo: string = new URL(request.url).pathname,
) {
	const session = await getUserSession(request);
	const userId = session.get("userId");

	if (!userId || typeof userId !== "number") {
		const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
		throw redirect(`/user/sign/in?${searchParams}`);
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			isAdmin: true,
			isSuperAdmin: true,
		},
	});

	if (!user || !user.isSuperAdmin) {
		throw new Response(null, {
			status: 403,
			statusText: "You are not allowed access here.",
		});
	}

	return user.id;
}

export async function requireAdminWithProgram(
	request: Request,
	programId: number,
) {
	const adminId = await requireAdmin(request);
	return await requireAccessToProgram(adminId, programId);
}

export async function getUser(
	request: Request,
): Promise<UserAuthenticated | null> {
	const userId = await getUserId(request);

	if (typeof userId !== "number") {
		// logout(request);
		return null;
	}

	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				isAdmin: true,
				isSuperAdmin: true,
				adminOfPrograms: true,
				photo: true,
			},
		});
		return user;
	} catch {
		throw logout(request);
	}
}

export async function getUserByEmail(
	email: string,
): Promise<UserAuthenticated | null> {
	return await prisma.user.findUnique({
		where: { email },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			isAdmin: true,
			isSuperAdmin: true,
			adminOfPrograms: true,
			photo: true,
		},
	});
}

export async function logout(request: Request) {
	const session = await getUserSession(request);
	return redirect("/user/sign/in", {
		headers: {
			"Set-Cookie": await storage.destroySession(session),
		},
	});
}

export async function sendPasswordResetLink(user: User) {
	const org = await getOrg();
	const reset = await prisma.userPasswordReset
		.upsert({
			where: {
				userId: user.id,
			},
			create: {
				user: {
					connect: {
						id: user.id,
					},
				},
				resetCode: randomUUID(),
			},
			update: {
				createdAt: new Date(),
				resetCode: randomUUID(),
			},
		})
		.catch((error) => {
			console.error(error);
			throwErrorResponse(error, "Could not create a reset code");
		});

	if (reset) {
		const resetUrl = `${domain}/user/reset-password/${user.id}/${reset.resetCode}`;

		// @todo dynamic org name (from settings?)
		await sendEmail({
			from: `${org.senderName ?? "Please configure in organisation settings"} <${org.senderEmail ?? "email-not-configured@example.com"}>`,
			to: user.email,
			subject: `Reset your password`,
			text: `Dear ${user.firstName} ${user.lastName},\n\nTo reset your password for ${org.name} Certificates, please click on the following link:\n${resetUrl}\n\nIf you haven't requested this password reset, please ignore or report this email.\n\nThank you!`,
			html: `<p>Dear ${user.firstName} ${user.lastName},</p><p>To reset your password for ${org.name} Certificates, please click on the following link:<br /><a href="${resetUrl}">${resetUrl}</a></p><p>If you haven't requested this password reset, please ignore or report this email.</p><p>Thank you!</p>`,
		}).catch((/*error*/) => {
			// @todo this should be a service-internal error, not user-facing
			/* throw new Response(error.message, {
				status: 500,
			}); */
		});
	}

	return reset;
}
