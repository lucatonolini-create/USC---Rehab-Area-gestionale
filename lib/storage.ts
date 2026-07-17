import { supabase } from "./supabase";

const BUCKET = "referti-clinici";

export async function uploadRefertoFile(
  atletaId: string,
  fileId: string,
  file: File,
): Promise<string | null> {
  const ext = file.name.includes(".") ? file.name.split(".").pop()! : "";
  const path = `${atletaId}/${fileId}${ext ? `.${ext}` : ""}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    console.error("[storage] upload error", error.message);
    return null;
  }
  return path;
}

export async function deleteRefertoFile(storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
}

export async function getSignedRefertoUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
