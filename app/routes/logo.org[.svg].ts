import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "~/lib/prisma.server";
import { readOrganisationLogo } from "~/lib/organisation.server";

async function serveDefaultLogo() {
	const defaultPath = join(process.cwd(), "public", "logo", "default.png");
	const buffer = await readFile(defaultPath);
	return new Response(new Uint8Array(buffer), {
		status: 200,
		headers: { "Content-Type": "image/png" },
	});
}

export async function loader() {
	const logo = await prisma.organisationLogo.findUnique({
		where: { id: 1 },
	});

	if (!logo) {
		return serveDefaultLogo();
	}

	const logoBuffer = await readOrganisationLogo(logo);

	if (logoBuffer) {
		return new Response(logoBuffer, {
			status: 200,
			headers: { "Content-Type": logo.contentType },
		});
	}

	return serveDefaultLogo();
}
