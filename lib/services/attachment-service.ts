"use client";

import { assertSupabaseConfigured } from "@/lib/supabase/client";

const bucketName = "blueprint-attachments";
const maxAttachmentSize = 15 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/xml",
  "text/xml",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type AttachmentOwnerType = "expense" | "fiscalDocument" | "project" | "supplier";

export type AttachmentInsert = {
  organization_id: string;
  owner_type: AttachmentOwnerType;
  owner_id: string;
  file_name: string;
  mime_type?: string;
  size?: number;
  storage_path: string;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

export function buildAttachmentPath(organizationId: string, ownerType: AttachmentOwnerType, ownerId: string, fileName: string) {
  return `${organizationId}/${ownerType}/${ownerId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

export async function uploadAttachment({
  file,
  organizationId,
  ownerId,
  ownerType,
}: {
  file: File;
  organizationId: string;
  ownerId: string;
  ownerType: AttachmentOwnerType;
}) {
  const fileExtension = file.name.split(".").pop()?.toLowerCase();

  if (file.size > maxAttachmentSize) {
    throw new Error("O anexo deve ter no máximo 15 MB.");
  }

  if (file.type && !allowedMimeTypes.has(file.type) && fileExtension !== "xml") {
    throw new Error("Formato de anexo não permitido.");
  }

  const supabase = assertSupabaseConfigured();
  const storagePath = buildAttachmentPath(organizationId, ownerType, ownerId, file.name);
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const attachment: AttachmentInsert = {
    organization_id: organizationId,
    owner_id: ownerId,
    owner_type: ownerType,
    file_name: file.name,
    mime_type: file.type || undefined,
    size: file.size,
    storage_path: storagePath,
  };
  const { data, error } = await supabase.from("attachments").insert(attachment).select("*").single();

  if (error) {
    await supabase.storage.from(bucketName).remove([storagePath]);
    throw error;
  }

  return data;
}

export async function createSignedAttachmentUrl(storagePath: string, expiresInSeconds = 300) {
  const supabase = assertSupabaseConfigured();
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
