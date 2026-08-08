import { supabase } from '../lib/supabase';

const CLIENT_BATCH_SIZE = 12;

/**
 * Ask Claude (via Supabase Edge Function) to group photos into existing or new events.
 * @param {Array<{ id: string, url: string, name?: string }>} photos
 * @param {Array<{ id: string|number, title: string, date?: Date|string, category?: string }>} events
 * @returns {Promise<{ matches: Array, newEvents: Array, unassigned: string[] }>}
 */
export async function classifyPhotos(photos, events) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be signed in to sort photos with AI.');
  }

  const photoList = (photos || [])
    .filter((p) => p?.id && p?.url)
    .map((p) => ({
      id: String(p.id),
      url: p.url,
      name: p.name || '',
    }));

  const eventList = (events || []).map((e) => ({
    id: String(e.id),
    title: e.title || 'Untitled',
    date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : e.date || null,
    category: e.category || null,
  }));

  if (photoList.length === 0) {
    return { matches: [], newEvents: [], unassigned: [] };
  }

  // Edge function also batches; client can send all at once for simpler UX.
  // For very large sets, chunk invokes to avoid payload limits.
  if (photoList.length <= CLIENT_BATCH_SIZE * 3) {
    return invokeSort(photoList, eventList);
  }

  const merged = { matches: [], newEvents: [], unassigned: [] };
  for (let i = 0; i < photoList.length; i += CLIENT_BATCH_SIZE * 2) {
    const chunk = photoList.slice(i, i + CLIENT_BATCH_SIZE * 2);
    const part = await invokeSort(chunk, eventList);
    merged.matches.push(...(part.matches || []));
    merged.newEvents.push(...(part.newEvents || []));
    merged.unassigned.push(...(part.unassigned || []));
  }
  return coalesceResults(merged);
}

async function invokeSort(photos, events) {
  const { data, error } = await supabase.functions.invoke('sort-photos', {
    body: { photos, events },
  });

  if (error) {
    console.error('sort-photos invoke error:', error);
    const msg =
      error.message ||
      data?.error ||
      'Failed to sort photos. Make sure the sort-photos function is deployed.';
    throw new Error(msg);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    matches: data?.matches || [],
    newEvents: data?.newEvents || [],
    unassigned: data?.unassigned || [],
  };
}

function coalesceResults(result) {
  const assigned = new Set();
  const matchesByEvent = new Map();
  const newEvents = [];

  for (const m of result.matches || []) {
    const photoIds = (m.photoIds || []).filter((id) => !assigned.has(String(id))).map(String);
    photoIds.forEach((id) => assigned.add(id));
    if (!photoIds.length) continue;
    const key = String(m.eventId);
    const existing = matchesByEvent.get(key);
    if (existing) {
      existing.photoIds.push(...photoIds);
    } else {
      matchesByEvent.set(key, {
        eventId: key,
        photoIds,
        reason: m.reason,
      });
    }
  }

  for (const n of result.newEvents || []) {
    const photoIds = (n.photoIds || []).filter((id) => !assigned.has(String(id))).map(String);
    photoIds.forEach((id) => assigned.add(id));
    if (photoIds.length) {
      newEvents.push({ ...n, photoIds });
    }
  }

  const unassigned = (result.unassigned || [])
    .map(String)
    .filter((id) => !assigned.has(id));

  return {
    matches: Array.from(matchesByEvent.values()),
    newEvents,
    unassigned,
  };
}
