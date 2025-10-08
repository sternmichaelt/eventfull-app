import { supabase } from '../lib/supabase';

export async function fetchPhotosForEvent(eventId) {
  const { data, error } = await supabase
    .from('photos')
    .select('id,name,url,created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addPhotoRow({ eventId, name, url }) {
  const { data, error } = await supabase
    .from('photos')
    .insert([{ event_id: eventId, name, url }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePhoto(photoId) {
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId);
  if (error) throw error;
}
