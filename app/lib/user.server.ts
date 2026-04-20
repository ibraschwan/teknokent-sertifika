import type {
  User,
  UserInvitation,
  UserPhoto,
} from "~/generated/prisma/client";
import type { FileUpload } from "@mjackson/form-data-parser";
import type { InviteForm, UserAuthenticated } from "./types";
import type { RegisterSchemaType } from "./schemas";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";
import bcrypt from "bcryptjs";
import {
  openFile as lazyOpenFile,
  writeFile as lazyWriteFile,
} from "@remix-run/fs";

import { domain } from "./config.server";
import { sendEmail } from "./email.server";
import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { prisma, throwErrorResponse } from "./prisma.server";
import { getOrg } from "./organisation.server";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const userPhotoDir = resolve(__dirname, "../../storage/user/photos");

export const backgroundRemovalIsConfigured: boolean = process.env
  .BACKGROUND_REMOVAL_URL
  ? true
  : false;

export const createUser = async (user: RegisterSchemaType) => {
  const emailLowerCase = user.email.toLowerCase();
  const passwordHash = await bcrypt.hash(user.password, 10);
  const verifyCode = randomUUID();
  const newUser = await prisma.user.create({
    data: {
      email: emailLowerCase,
      password: passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      verifyCode,
    },
    include: {
      adminOfPrograms: true,
      photo: true,
    },
  });

  await sendVerificationEmail(newUser);
  return { id: newUser.id, email: emailLowerCase };
};

export const createUserOAuth = async (
  user: {
    firstName: string;
    lastName: string;
    email: string;
  },
  source: string,
): Promise<UserAuthenticated> => {
  const emailLowerCase = user.email.toLowerCase();
  const verifyCode = randomUUID();

  const userCreated = await prisma.user.create({
    data: {
      email: emailLowerCase,
      password: `oauth:${source}`,
      firstName: user.firstName,
      lastName: user.lastName,
      verifyCode,
      isAdmin: false,
      isSuperAdmin: false,
      isVerified: true,
    },
    include: {
      adminOfPrograms: true,
      photo: true,
    },
  });

  if (userCreated !== null) {
    return userCreated;
  }

  throw new Response("Could not create user", {
    status: 500,
    statusText: "Could not create user",
  });
};

export const changePassword = async (user: User, newPassword: string) => {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: passwordHash,
    },
  });
  return updatedUser;
};

interface UserInvitationSender {
  email: string;
  firstName: string;
  lastName: string;
}

export const createUserInvitation = async (
  user: InviteForm,
  from: UserInvitationSender | null,
) => {
  const verifyCode = randomUUID();
  const emailLowerCase = user.email.toLowerCase();
  const invite = await prisma.userInvitation.create({
    data: {
      email: emailLowerCase,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: true,
      adminOfPrograms: user.adminOfPrograms,
      verifyCode,
    },
  });
  await sendInvitationEmail(invite, from);
  return { id: invite.id, email: emailLowerCase };
};

export const sendVerificationEmail = async (user: User) => {
  const org = await getOrg();
  // @todo test for user-enumeration vulnerability
  const verificationUrl = `${domain}/user/verify/${user.id}/${user.verifyCode}`;

  // @todo dynamic org name (from settings?)
  await sendEmail({
    from: `${org.senderName ?? "Please configure in organisation settings"} <${org.senderEmail ?? "email-not-configured@example.com"}>`,
    to: user.email,
    subject: `Lütfen e-postanı doğrula`,
    text: `Sevgili ${user.firstName} ${user.lastName},\n\n${org.name} Sertifikaları için kaydını tamamlamak için lütfen aşağıdaki bağlantıya tıkla:\n${verificationUrl}\n\nKaydı sen yapmadıysan lütfen bu e-postayı yok say veya bildir.\n\nTeşekkürler!`,
    html: `<p>Sevgili ${user.firstName} ${user.lastName},</p><p>${org.name} Sertifikaları için kaydını tamamlamak için lütfen aşağıdaki bağlantıya tıkla:<br /><a href="${verificationUrl}">${verificationUrl}</a></p><p>Kaydı sen yapmadıysan lütfen bu e-postayı yok say veya bildir.</p><p>Teşekkürler!</p>`,
  }).catch((error) => {
    throw new Response(error.message, {
      status: 500,
    });
  });

  return true;
};

export const sendInvitationEmail = async (
  invite: UserInvitation,
  from: UserInvitationSender | null,
) => {
  const org = await getOrg();
  // @todo dynamic org name from database
  const acceptUrl = `${domain}/user/accept-invite/${invite.id}/${invite.verifyCode}`;

  const text = `Sevgili ${invite.firstName} ${invite.lastName},\n\n${
    from
      ? `${from.firstName} ${from.lastName} seni`
      : "Seni"
  } ${
    org.name
  } sertifika aracında yönetici olmaya davet ediyor.\n\nDaveti kabul etmek için lütfen aşağıdaki bağlantıya tıkla:\n${acceptUrl}\n\nTeşekkürler!`;
  const html = `<p>Sevgili ${invite.firstName} ${invite.lastName},</p><p>${
    from
      ? `${from.firstName} ${from.lastName} seni`
      : "Seni"
  } ${
    org.name
  } sertifika aracında yönetici olmaya davet ediyor.</p><p>Daveti kabul etmek için lütfen aşağıdaki bağlantıya tıkla:<br /><a href="${acceptUrl}">${acceptUrl}</a></p><p>Teşekkürler!</p>`;

  await sendEmail({
    from: `${org.senderName ?? "Please configure in organisation settings"} <${org.senderEmail ?? "email-not-configured@example.com"}>`,
    to: invite.email,
    subject: `${org.name} Sertifikaları'na davet edildin`,
    text,
    html,
  }).catch((error) => {
    throw new Response(error.message, {
      status: 500,
    });
  });

  return true;
};

export async function saveTransparentPhotoUpload(
  userPhoto: UserPhoto,
  photo: FileUpload,
) {
  const folderCreated = await ensureFolderExists(userPhotoDir);
  if (!folderCreated) {
    throw new Error("Could not create user photo storage folder");
  }

  const filepath = `${userPhotoDir}/${userPhoto.id}.transparent.png`;
  await lazyWriteFile(filepath, photo);
  return lazyOpenFile(filepath);
}

export async function readPhoto(userPhoto: UserPhoto) {
  return await readFileIfExists(
    `${userPhotoDir}/${userPhoto.id}.transparent.png`,
  );
}

export async function deleteUserPhoto(userPhoto: UserPhoto) {
  await unlink(`${userPhotoDir}/${userPhoto.id}.transparent.png`).catch(
    (error) => {
      console.error(
        `Encountered the following error when trying to delete the transparent photo file in storage for UserPhoto ID ${userPhoto.id}:`,
      );
      console.error(error);
    },
  );
  return await prisma.userPhoto
    .delete({
      where: {
        id: userPhoto.id,
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Could not delete user photo");
    });
}
