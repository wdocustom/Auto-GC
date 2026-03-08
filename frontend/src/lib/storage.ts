import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'site-media';

/**
 * Uploads a file to Supabase Storage and returns a public URL.
 *
 * @param file - The file to upload (from FormData)
 * @param folder - Storage path prefix, e.g. "projects/<projectId>"
 * @returns The public URL of the uploaded file
 */
export async function uploadToSupabase(file: File, folder: string): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${timestamp}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl;
}
