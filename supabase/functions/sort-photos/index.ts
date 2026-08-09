import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PhotoIn = { id: string; url: string; name?: string; taken_at?: string | null };
type EventIn = { id: string; title: string; date?: string; category?: string };

type SortResult = {
  matches: Array<{ eventId: string; photoIds: string[]; reason?: string }>;
  newEvents: Array<{
    title: string;
    date?: string;
    category?: string;
    photoIds: string[];
    reason?: string;
  }>;
  unassigned: string[];
};

const MODEL = 'claude-sonnet-5';
const BATCH_SIZE = 12;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) {
      return json({ error: 'ANTHROPIC_API_KEY is not configured on the server' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const photos: PhotoIn[] = Array.isArray(body?.photos) ? body.photos : [];
    const events: EventIn[] = Array.isArray(body?.events) ? body.events : [];

    if (photos.length === 0) {
      return json({ matches: [], newEvents: [], unassigned: [] });
    }

    const validPhotos = photos.filter((p) => p?.id && p?.url && /^https?:\/\//i.test(p.url));
    if (validPhotos.length === 0) {
      return json({
        matches: [],
        newEvents: [],
        unassigned: photos.map((p) => String(p.id)),
        warning: 'No photos with public http(s) URLs could be sent to Claude',
      });
    }

    const batches: PhotoIn[][] = [];
    for (let i = 0; i < validPhotos.length; i += BATCH_SIZE) {
      batches.push(validPhotos.slice(i, i + BATCH_SIZE));
    }

    const results: SortResult[] = [];
    for (const batch of batches) {
      results.push(await classifyBatch(batch, events, anthropicKey));
    }

    return json(mergeResults(results, validPhotos.map((p) => String(p.id))));
  } catch (err) {
    console.error('sort-photos error:', err);
    return json({ error: err?.message || 'Failed to sort photos' }, 500);
  }
});

async function classifyBatch(
  photos: PhotoIn[],
  events: EventIn[],
  apiKey: string
): Promise<SortResult> {
  const photoIds = photos.map((p) => String(p.id));
  const eventsSummary = events.map((e) => ({
    id: String(e.id),
    title: e.title,
    date: e.date || null,
    category: e.category || null,
  }));

  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `You are sorting personal life photos into timeline events.

Existing events (match to these when content clearly fits):
${JSON.stringify(eventsSummary, null, 2)}

Photos in this batch (ids, filenames, and camera taken_at when known):
${JSON.stringify(
  photos.map((p) => ({
    id: String(p.id),
    name: p.name || '',
    taken_at: p.taken_at || null,
  })),
  null,
  2
)}

Rules:
- Prefer matching an existing event when the photo clearly belongs to it.
- When taken_at is present, treat it as the real date the photo was taken (prefer over visual guesses).
- Otherwise group related photos into suggested newEvents with a short title, ISO date (YYYY-MM-DD) from taken_at when available else a visual guess if possible, and category one of: milestone, education, career, relationship, birthday, family.
- Put unclear photos in unassigned.
- Every photo id from this batch must appear exactly once across matches, newEvents, and unassigned.
- Respond with ONLY valid JSON (no markdown) in this shape:
{
  "matches": [{ "eventId": "string", "photoIds": ["string"], "reason": "short" }],
  "newEvents": [{ "title": "string", "date": "YYYY-MM-DD", "category": "family", "photoIds": ["string"], "reason": "short" }],
  "unassigned": ["string"]
}`,
    },
  ];

  for (const photo of photos) {
    content.push({
      type: 'text',
      text: `Photo id=${photo.id} name=${photo.name || ''} taken_at=${photo.taken_at || 'unknown'}`,
    });
    content.push({
      type: 'image',
      source: {
        type: 'url',
        url: photo.url,
      },
    });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Anthropic error:', response.status, errText);
    throw new Error(`Claude API error (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((block: { type: string }) => block.type === 'text')
    .map((block: { text: string }) => block.text)
    .join('\n');

  const parsed = parseJsonResult(text);
  return normalizeResult(parsed, photoIds, events.map((e) => String(e.id)));
}

function parseJsonResult(text: string): SortResult {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Claude did not return JSON');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeResult(
  result: SortResult,
  photoIds: string[],
  eventIds: string[]
): SortResult {
  const allowed = new Set(photoIds);
  const eventSet = new Set(eventIds);
  const seen = new Set<string>();

  const takeIds = (ids: unknown) => {
    if (!Array.isArray(ids)) return [];
    const out: string[] = [];
    for (const id of ids) {
      const sid = String(id);
      if (!allowed.has(sid) || seen.has(sid)) continue;
      seen.add(sid);
      out.push(sid);
    }
    return out;
  };

  const matches = (Array.isArray(result?.matches) ? result.matches : [])
    .map((m) => ({
      eventId: String(m.eventId),
      photoIds: takeIds(m.photoIds),
      reason: m.reason ? String(m.reason) : undefined,
    }))
    .filter((m) => eventSet.has(m.eventId) && m.photoIds.length > 0);

  const newEvents = (Array.isArray(result?.newEvents) ? result.newEvents : [])
    .map((n) => ({
      title: String(n.title || 'Untitled event').slice(0, 120),
      date: n.date ? String(n.date) : undefined,
      category: n.category ? String(n.category) : 'milestone',
      photoIds: takeIds(n.photoIds),
      reason: n.reason ? String(n.reason) : undefined,
    }))
    .filter((n) => n.photoIds.length > 0);

  const unassignedFromModel = takeIds(result?.unassigned);
  const leftover = photoIds.filter((id) => !seen.has(id));

  return { matches, newEvents, unassigned: [...unassignedFromModel, ...leftover] };
}

function mergeResults(results: SortResult[], allPhotoIds: string[]): SortResult {
  const matchesByEvent = new Map<string, { eventId: string; photoIds: string[]; reason?: string }>();
  const newEvents: SortResult['newEvents'] = [];
  const assigned = new Set<string>();

  for (const r of results) {
    for (const m of r.matches || []) {
      const existing = matchesByEvent.get(m.eventId);
      if (existing) {
        for (const id of m.photoIds) {
          if (!assigned.has(id)) {
            existing.photoIds.push(id);
            assigned.add(id);
          }
        }
        if (!existing.reason && m.reason) existing.reason = m.reason;
      } else {
        const photoIds = m.photoIds.filter((id) => !assigned.has(id));
        photoIds.forEach((id) => assigned.add(id));
        if (photoIds.length) {
          matchesByEvent.set(m.eventId, {
            eventId: m.eventId,
            photoIds,
            reason: m.reason,
          });
        }
      }
    }
    for (const n of r.newEvents || []) {
      const photoIds = n.photoIds.filter((id) => !assigned.has(id));
      photoIds.forEach((id) => assigned.add(id));
      if (photoIds.length) {
        newEvents.push({ ...n, photoIds });
      }
    }
  }

  return {
    matches: Array.from(matchesByEvent.values()),
    newEvents,
    unassigned: allPhotoIds.filter((id) => !assigned.has(id)),
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
