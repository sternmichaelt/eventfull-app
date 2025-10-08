import { supabase } from '../lib/supabase';

export async function fetchJournals(eventId) {
  const { data, error } = await supabase
    .from('journals')
    .select('id,title,content,created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createJournal(entry) {
  const { data, error } = await supabase
    .from('journals')
    .insert([entry])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateJournal(id, changes) {
  const { data, error } = await supabase
    .from('journals')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteJournal(id) {
  const { error } = await supabase
    .from('journals')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
