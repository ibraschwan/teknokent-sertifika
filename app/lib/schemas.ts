import { z } from "zod";
import { assessPassword } from "~/components/password-indicator";

// Note on email validation: the default RegEx from Zod is relatively strict and doesn't allow for international/UTF-8 characters in email addresses, that's why we're opting for the looser Unicode pattern
// See more here: https://zod.dev/api?id=emails

// To generate types for the schemas, we can use z.infer(typeof schema), for more see: https://www.allthingstypescript.dev/p/using-zod-schemas-as-source-of-truth

export const RegisterSchema = z.object({
	email: z
		.string("Lütfen bir e-posta adresi gir")
		.min(1, { message: "Lütfen bir e-posta adresi gir" })
		.email({
			pattern: z.regexes.unicodeEmail,
			message: "Bu e-posta eksik görünüyor",
		})
		.toLowerCase(),
	password: z
		.string("Lütfen bir parola gir")
		.trim()
		.refine((val) => assessPassword(val).enough, {
			error: "Lütfen daha güçlü bir parola kullan",
		}),
	firstName: z.string("Lütfen adını gir").trim(),
	lastName: z.string("Lütfen soyadını gir").trim(),
});

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
	email: z
		.string("Lütfen bir e-posta adresi gir")
		.min(1, { message: "Lütfen bir e-posta adresi gir" })
		.email({
			pattern: z.regexes.unicodeEmail,
			message: "Bu e-posta eksik görünüyor",
		})
		.toLowerCase(),
	password: z.string("Lütfen bir parola gir").trim(),
});

export const EmailSchema = z.object({
	email: z
		.string("Lütfen bir e-posta adresi gir")
		.min(1, { message: "Lütfen bir e-posta adresi gir" })
		.email({
			pattern: z.regexes.unicodeEmail,
			message: "Bu e-posta eksik görünüyor",
		})
		.toLowerCase(),
});

export const PasswordSchema = z.object({
	password: z
		.string("Lütfen bir parola gir")
		.trim()
		.refine((val) => assessPassword(val).enough, {
			error: "Lütfen daha güçlü bir parola kullan",
		}),
});

export const CertificateInputSchema = z.object({
	firstName: z
		.string("Lütfen en azından bir ad gir")
		.min(1, { message: "Lütfen en azından bir ad gir" }),
	lastName: z.string().optional().nullable(),
	email: z
		.string("Lütfen bir e-posta adresi gir")
		.min(1, { message: "Lütfen bir e-posta adresi gir" })
		.email({
			pattern: z.regexes.unicodeEmail,
			message: "Bu e-posta eksik görünüyor",
		})
		.toLowerCase(),
	teamName: z.string().optional().nullable(),
	templateId: z.int(),
});
