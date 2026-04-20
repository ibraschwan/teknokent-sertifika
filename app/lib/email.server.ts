import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface Attachment {
	filename: string;
	content: Buffer;
	contentType?: string;
}

interface SendEmailOptions {
	from: string;
	to: string;
	subject: string;
	text?: string;
	html?: string;
	attachments?: Attachment[];
	tags?: { name: string; value: string }[];
}

async function sendEmail(options: SendEmailOptions) {
	const { data, error } = await resend.emails.send({
		from: options.from,
		to: options.to,
		subject: options.subject,
		html: options.html ?? "",
		text: options.text,
		attachments: options.attachments,
		tags: options.tags,
	});

	if (error) {
		throw new Error(error.message);
	}

	return data!;
}

export { sendEmail };
export type { Attachment, SendEmailOptions };
