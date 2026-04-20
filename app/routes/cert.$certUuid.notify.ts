import type { Route } from "./+types/cert.$certUuid.notify";
import { redirect } from "react-router";
import slug from "slug";

import { requireAdmin } from "~/lib/auth.server";
import { domain } from "~/lib/config.server";
import { sendEmail, type Attachment } from "~/lib/email.server";
import { getOrg } from "~/lib/organisation.server";
import { generateCertificate } from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

// @todo refactor to route org.program.$programId.batch.batchId.certificates.$certId.notify.ts

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdmin(request);

  const certificate = await prisma.certificate.findUnique({
    where: {
      uuid: params.certUuid,
    },
    include: {
      batch: {
        include: {
          program: true,
        },
      },
      template: true,
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const org = await getOrg();

  const social = await prisma.socialPreview.findUnique({
    where: {
      programId: certificate.batch.programId,
    },
  });

  const participant = await prisma.user.findUnique({
    where: {
      email: certificate.email,
    },
  });

  const pdf = await generateCertificate(
    certificate.batch,
    certificate,
    certificate.template,
    true,
  );

  const attachments: Attachment[] = [];

  if (pdf) {
    attachments.push({
      filename:
        slug(`${certificate.firstName} ${certificate.lastName}`) +
        ".certificate.pdf",
      content: pdf,
      contentType: "application/pdf",
    });
  }

  const certUrl = `${domain}/view/${certificate.uuid}?sign${
    participant ? "in" : "up"
  }=${certificate.email}`;
  const loginUrl = participant
    ? `${domain}/user/sign/in?email=${certificate.email}`
    : `${domain}/user/sign/up?email=${certificate.email}&firstName=${certificate.firstName}&lastName=${certificate.lastName}`;

  const mailText = social
    ? `Dear ${certificate.firstName},\n\nYour certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready for you.\n\n\nDownload your certificate from this link:\n${certUrl}\n\n\nShare your certificate on social media with your personal link:\n1. Sign up to our certificate tool with this email address at the link above\n2. Insert your photo into the social media preview\n3. Share it across your platforms\n\n\nCongratulations!`
    : `Dear ${certificate.firstName},\n\nYour certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready and the document attached to this email.\n\nAll the best!`;
  const mailHTML = social
    ? `<p>Dear ${certificate.firstName},</p><p>Your certificate for ${
        certificate.batch.program.name
      } – ${
        certificate.batch.name
      } is ready for you.</p><p>Download your certificate from this link:<br/><a href="${certUrl}" rel="notrack">${certUrl}</a></p><p>Share your certificate on social media with your personal link:<ol><li><a href="${loginUrl}" rel="notrack">Sign ${
        participant ? "in" : "up"
      }</a> to our certificate tool with this email address at the link above</li><li>Insert your photo into the social media preview</li><li>Share it across your platforms</li></ol></p><p>Congratulations!</p><br/>`
    : `<p>Dear ${certificate.firstName},</p><p>Your certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready and the document attached to this email.</p><p>All the best!</p>`;

  // @todo sender email, domain and links need to be configurable
  const response = await sendEmail({
    from: `${org.senderName ?? "Please configure in organisation settings"} <${org.senderEmail ?? "email-not-configured@example.com"}>`,
    to: certificate.email,
    subject: `Your certificate from ${certificate.batch.program.name} is ready`,
    text: mailText,
    html: mailHTML,
    attachments,
    tags: [{ name: "certificateUuid", value: certificate.uuid }],
  }).catch((error) => {
    throw new Response(error.message, {
      status: 500,
    });
  });

  await prisma.certificate.update({
    where: {
      id: certificate.id,
    },
    data: {
      notifiedAt: new Date(),
      mjResponse: response,
    },
  });

  return response;
}

export async function loader() {
  // @todo redirect to the correct program/batch overview?
  return redirect(`/org/program`);
}
