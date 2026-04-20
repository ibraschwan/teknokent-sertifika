import type { Typeface } from "~/generated/prisma/client";
import type { FileUpload } from "@mjackson/form-data-parser";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";

import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { prisma, throwErrorResponse } from "./prisma.server";
import {
  openFile as lazyOpenFile,
  writeFile as lazyWriteFile,
} from "@remix-run/fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const typefaceDir = resolve(__dirname, "../../storage/typefaces");

const ACCEPTED_FONT_MIMES = new Set([
  "font/ttf",
  "font/otf",
  "font/sfnt",
  "application/x-font-ttf",
  "application/x-font-otf",
  "application/vnd.ms-opentype",
  "application/octet-stream",
]);

export function isAcceptedFontUpload(upload: FileUpload) {
  if (ACCEPTED_FONT_MIMES.has(upload.type)) return true;
  const name = upload.name?.toLowerCase() ?? "";
  return name.endsWith(".ttf") || name.endsWith(".otf");
}

function extensionForUpload(upload: FileUpload): "ttf" | "otf" {
  if (upload.type === "font/otf" || upload.type === "application/x-font-otf") {
    return "otf";
  }
  const name = upload.name?.toLowerCase() ?? "";
  if (name.endsWith(".otf")) return "otf";
  return "ttf";
}

export async function saveTypefaceUpload(
  typeface: Typeface,
  typefaceFile: FileUpload,
) {
  const folderCreated = await ensureFolderExists(typefaceDir);
  if (!folderCreated) {
    throw new Error("Could not create typefaces storage folder");
  }

  const ext = extensionForUpload(typefaceFile);
  const filepath = `${typefaceDir}/${typeface.id}.${ext}`;
  await lazyWriteFile(filepath, typefaceFile);
  // Remove any stale file at the other extension from a prior upload
  const otherExt = ext === "ttf" ? "otf" : "ttf";
  await unlink(`${typefaceDir}/${typeface.id}.${otherExt}`).catch(() => {});
  return lazyOpenFile(filepath);
}

export async function deleteTypefaceTTF(typefaceId: number) {
  await Promise.all(
    (["ttf", "otf"] as const).map((ext) =>
      unlink(`${typefaceDir}/${typefaceId}.${ext}`).catch((error) => {
        if (error?.code !== "ENOENT") {
          console.error(
            `Error deleting typeface ${typefaceId}.${ext}:`,
            error,
          );
        }
      }),
    ),
  );
}

export async function deleteTypeface(typefaceId: number) {
  await deleteTypefaceTTF(typefaceId);

  return await prisma.typeface
    .delete({
      where: {
        id: typefaceId,
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Could not delete typeface");
    });
}

export async function getAvailableTypefaces() {
  const typefaces = await prisma.typeface.findMany();

  const typefaceMap = new Map<string, Typeface>();
  for (const tf of typefaces) {
    typefaceMap.set(tf.name, tf);
  }

  return typefaceMap;
}

export async function readFontFile(typefaceId: number) {
  const ttf = await readFileIfExists(`${typefaceDir}/${typefaceId}.ttf`);
  if (ttf) return ttf;
  return readFileIfExists(`${typefaceDir}/${typefaceId}.otf`);
}
