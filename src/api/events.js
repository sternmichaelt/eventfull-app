import { supabase } from '../lib/supabase';

export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id,title,description,date,category,image_url,created_at')
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEvent(event) {
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(eventId, changes) {
  const { data, error } = await supabase
    .from('events')
    .update(changes)
    .eq('id', eventId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(eventId) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
}
