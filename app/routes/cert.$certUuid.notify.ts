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
    ? `Sevgili ${certificate.firstName},\n\n${certificate.batch.program.name} – ${certificate.batch.name} için sertifikan hazır.\n\n\nSertifikanı bu bağlantıdan indir:\n${certUrl}\n\n\nKişisel bağlantınla sertifikanı sosyal medyada paylaş:\n1. Yukarıdaki bağlantıdan bu e-posta adresiyle sertifika aracımıza kayıt ol\n2. Sosyal medya önizlemesine fotoğrafını ekle\n3. Platformlarında paylaş\n\n\nTebrikler!`
    : `Sevgili ${certificate.firstName},\n\n${certificate.batch.program.name} – ${certificate.batch.name} için sertifikan hazır ve belge bu e-postaya eklenmiştir.\n\nİyi şanslar!`;
  const mailHTML = social
    ? `<p>Sevgili ${certificate.firstName},</p><p>${
        certificate.batch.program.name
      } – ${
        certificate.batch.name
      } için sertifikan hazır.</p><p>Sertifikanı bu bağlantıdan indir:<br/><a href="${certUrl}" rel="notrack">${certUrl}</a></p><p>Kişisel bağlantınla sertifikanı sosyal medyada paylaş:<ol><li>Yukarıdaki bağlantıdan bu e-posta adresiyle sertifika aracımıza <a href="${loginUrl}" rel="notrack">${
        participant ? "giriş yap" : "kayıt ol"
      }</a></li><li>Sosyal medya önizlemesine fotoğrafını ekle</li><li>Platformlarında paylaş</li></ol></p><p>Tebrikler!</p><br/>`
    : `<p>Sevgili ${certificate.firstName},</p><p>${certificate.batch.program.name} – ${certificate.batch.name} için sertifikan hazır ve belge bu e-postaya eklenmiştir.</p><p>İyi şanslar!</p>`;

  // @todo sender email, domain and links need to be configurable
  const response = await sendEmail({
    from: `${org.senderName ?? "Please configure in organisation settings"} <${org.senderEmail ?? "email-not-configured@example.com"}>`,
    to: certificate.email,
    subject: `${certificate.batch.program.name} sertifikan hazır`,
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
