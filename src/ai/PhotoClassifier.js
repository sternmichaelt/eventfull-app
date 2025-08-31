// Pluggable AI Photo Classifier
// Replace the logic inside classifyPhotos with a real AI API call if desired.
// Current mock: fuzzy match photo names to event titles to suggest event grouping.

/**
 * @typedef {Object} Photo
 * @property {string} id
 * @property {string} url
 * @property {string} name
 * @property {number} eventId
 * @property {string} category
 */

/**
 * @typedef {Object} Event
 * @property {number} id
 * @property {string} title
 * @property {Date} date
 * @property {string} category
 */

/**
 * @typedef {Object} Suggestion
 * @property {string} photoId
 * @property {number} fromEventId
 * @property {number} toEventId
 * @property {string} reason
 */

/**
 * classifyPhotos returns suggested reassignments of photos to events.
 * @param {Photo[]} photos flat list of photos with eventId
 * @param {Event[]} events list of events
 * @param {string} prompt free-form instruction from user
 * @returns {{ suggestions: Suggestion[] }}
 */
export async function classifyPhotos(photos, events, prompt) {
  // Build simple tokens for event titles
  const eventTokens = new Map(); // eventId -> Set(tokens)
  events.forEach(e => {
    const tokens = tokenize(e.title);
    eventTokens.set(e.id, tokens);
  });

  const suggestions = [];

  for (const p of photos) {
    // Skip event main images (convention: id ends with '-main')
    if (String(p.id).includes('-main')) continue;

    const nameTokens = tokenize(p.name || '');
    let best = { eventId: p.eventId, score: 0 };

    for (const e of events) {
      const score = jaccard(nameTokens, eventTokens.get(e.id) || new Set());
      if (score > best.score) best = { eventId: e.id, score };
    }

    // Only suggest if best is different and non-trivial
    if (best.eventId !== p.eventId && best.score >= 0.2) {
      const toEvent = events.find(e => e.id === best.eventId);
      const fromEvent = events.find(e => e.id === p.eventId);
      suggestions.push({
        photoId: p.id,
        fromEventId: p.eventId,
        toEventId: best.eventId,
        reason: `Matched name to "${toEvent?.title}" (similarity ${(best.score * 100).toFixed(0)}%). Previously in "${fromEvent?.title}".`
      });
    }
  }

  // Simulate async behavior
  await delay(250);
  return { suggestions };
}

function tokenize(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
} 