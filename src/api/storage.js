import { supabase } from '../lib/supabase';

const BUCKET = 'event-photos';

export async function uploadToBucket(eventId, file) {
  const ext = file.name.split('.').pop();
  const path = `${eventId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file);
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl }; // For public buckets; use signed URLs if private
}

export async function removeFromBucket(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
