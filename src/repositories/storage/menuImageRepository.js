import { supabase } from "@/shared/api/supabaseClient";

const BUCKET_NAME = "menu-images";

function throwIfError(error) {
  if (error) throw error;
}

export async function uploadMenuImageObject({ filePath, file, contentType }) {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType,
      upsert: false,
    });

  throwIfError(error);
}

export function getMenuImagePublicUrl(filePath) {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function removeMenuImageObject(filePath) {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  throwIfError(error);
}

export const menuImageRepository = {
  uploadMenuImageObject,
  getMenuImagePublicUrl,
  removeMenuImageObject,
};
