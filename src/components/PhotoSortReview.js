import React, { useMemo, useState } from 'react';
import { X, Sparkles, Check, Plus, Images } from 'lucide-react';
import { createEvent, tagPhotoToEvent, updatePhoto, updateEvent } from '../api/events';

function photoMapFromList(photos) {
  const map = new Map();
  (photos || []).forEach((p) => map.set(String(p.id), p));
  return map;
}

function parseSuggestedDate(value) {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Review AI-suggested photo groups: apply to existing events, create new ones, or leave unassigned.
 */
export default function PhotoSortReview({
  photos,
  events,
  suggestions,
  timelineId,
  allCategories = {},
  onClose,
  onApplied,
}) {
  const byId = useMemo(() => photoMapFromList(photos), [photos]);

  const [matches, setMatches] = useState(() =>
    (suggestions?.matches || []).map((m, i) => ({
      key: `match-${m.eventId}-${i}`,
      eventId: String(m.eventId),
      photoIds: (m.photoIds || []).map(String),
      reason: m.reason || '',
      status: 'pending',
    }))
  );

  const [newEvents, setNewEvents] = useState(() =>
    (suggestions?.newEvents || []).map((n, i) => ({
      key: `new-${i}`,
      title: n.title || 'New event',
      date: n.date || '',
      category: n.category || 'milestone',
      photoIds: (n.photoIds || []).map(String),
      reason: n.reason || '',
      status: 'pending',
    }))
  );

  const [unassigned, setUnassigned] = useState(() =>
    (suggestions?.unassigned || []).map(String)
  );

  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState('');

  const eventById = useMemo(() => {
    const map = new Map();
    (events || []).forEach((e) => map.set(String(e.id), e));
    return map;
  }, [events]);

  const moveToUnassigned = (photoId, fromKey, kind) => {
    const id = String(photoId);
    if (kind === 'match') {
      setMatches((prev) =>
        prev.map((g) =>
          g.key === fromKey ? { ...g, photoIds: g.photoIds.filter((p) => p !== id) } : g
        )
      );
    } else {
      setNewEvents((prev) =>
        prev.map((g) =>
          g.key === fromKey ? { ...g, photoIds: g.photoIds.filter((p) => p !== id) } : g
        )
      );
    }
    setUnassigned((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const applyMatch = async (group) => {
    if (!group.photoIds.length) return;
    setBusyKey(group.key);
    setError('');
    try {
      const event = eventById.get(group.eventId);
      const category = event?.category || 'untagged';
      for (const photoId of group.photoIds) {
        await tagPhotoToEvent(photoId, group.eventId);
        await updatePhoto(photoId, { category });
      }
      if (!event?.primary_photo_id && group.photoIds[0]) {
        const primary = byId.get(group.photoIds[0]);
        await updateEvent(group.eventId, {
          primary_photo_id: group.photoIds[0],
          image_url: primary?.url && !String(primary.url).startsWith('data:') ? primary.url : null,
        });
      }
      setMatches((prev) =>
        prev.map((g) => (g.key === group.key ? { ...g, status: 'done' } : g))
      );
      if (onApplied) onApplied();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to apply photos to event');
    } finally {
      setBusyKey(null);
    }
  };

  const createFromGroup = async (group) => {
    if (!group.photoIds.length) return;
    setBusyKey(group.key);
    setError('');
    try {
      const primaryId = group.photoIds[0];
      const primary = byId.get(primaryId);
      const category = allCategories[group.category] ? group.category : 'milestone';
      const created = await createEvent({
        timeline_id: timelineId,
        title: group.title || 'New event',
        description: group.reason || '',
        date: parseSuggestedDate(group.date),
        category,
        importance: 5,
        primary_photo_id: primaryId,
        image: primary?.url || null,
        image_url: primary?.url || null,
        images: [],
        journals: [],
        recordings: [],
      });

      for (const photoId of group.photoIds) {
        await tagPhotoToEvent(photoId, created.id);
        await updatePhoto(photoId, { category });
      }

      setNewEvents((prev) =>
        prev.map((g) => (g.key === group.key ? { ...g, status: 'done' } : g))
      );
      if (onApplied) onApplied();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create event');
    } finally {
      setBusyKey(null);
    }
  };

  const skipGroup = (key, kind) => {
    if (kind === 'match') {
      setMatches((prev) => {
        const group = prev.find((g) => g.key === key);
        if (group?.photoIds?.length) {
          setUnassigned((u) => [...u, ...group.photoIds.filter((id) => !u.includes(id))]);
        }
        return prev.map((g) =>
          g.key === key ? { ...g, photoIds: [], status: 'skipped' } : g
        );
      });
    } else {
      setNewEvents((prev) => {
        const group = prev.find((g) => g.key === key);
        if (group?.photoIds?.length) {
          setUnassigned((u) => [...u, ...group.photoIds.filter((id) => !u.includes(id))]);
        }
        return prev.map((g) =>
          g.key === key ? { ...g, photoIds: [], status: 'skipped' } : g
        );
      });
    }
  };

  const renderPhotoGrid = (photoIds, groupKey, kind, disabled) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {photoIds.map((id) => {
        const photo = byId.get(id);
        if (!photo) return null;
        return (
          <div key={id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
            <img src={photo.url} alt={photo.name || ''} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                title="Remove from this group"
                onClick={() => moveToUnassigned(id, groupKey, kind)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-white/95 border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const pendingMatches = matches.filter((g) => g.status === 'pending' && g.photoIds.length > 0);
  const pendingNew = newEvents.filter((g) => g.status === 'pending' && g.photoIds.length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(71, 85, 105, 0.6)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="w-5 h-5 text-slate-700 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">Review AI photo sort</h3>
              <p className="text-xs text-slate-500">
                Remove mismatches, then apply to existing events or create new ones
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {pendingMatches.length === 0 && pendingNew.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No pending groups left. Unassigned photos stay in your library.
            </div>
          )}

          {pendingMatches.map((group) => {
            const event = eventById.get(group.eventId);
            const busy = busyKey === group.key;
            return (
              <section key={group.key} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Existing: {event?.title || `Event ${group.eventId}`}
                    </div>
                    {group.reason && <p className="text-xs text-slate-500 mt-0.5">{group.reason}</p>}
                    <p className="text-xs text-slate-400 mt-1">{group.photoIds.length} photo(s)</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => skipGroup(group.key, 'match')}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600"
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      disabled={busy || !group.photoIds.length}
                      onClick={() => applyMatch(group)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {busy ? 'Applying…' : 'Apply to event'}
                    </button>
                  </div>
                </div>
                {renderPhotoGrid(group.photoIds, group.key, 'match', busy)}
              </section>
            );
          })}

          {pendingNew.map((group) => {
            const busy = busyKey === group.key;
            const catLabel = allCategories[group.category]?.label || group.category;
            return (
              <section key={group.key} className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      New Event: {group.title}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {group.date ? `Suggested date: ${group.date}` : 'Date: today'}
                      {catLabel ? ` · ${catLabel}` : ''}
                    </p>
                    {group.reason && <p className="text-xs text-slate-500 mt-0.5">{group.reason}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={group.title}
                        onChange={(e) =>
                          setNewEvents((prev) =>
                            prev.map((g) =>
                              g.key === group.key ? { ...g, title: e.target.value } : g
                            )
                          )
                        }
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1 max-w-xs"
                        disabled={busy}
                      />
                      <input
                        type="date"
                        value={group.date || ''}
                        onChange={(e) =>
                          setNewEvents((prev) =>
                            prev.map((g) =>
                              g.key === group.key ? { ...g, date: e.target.value } : g
                            )
                          )
                        }
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                        disabled={busy}
                      />
                      <select
                        value={group.category}
                        onChange={(e) =>
                          setNewEvents((prev) =>
                            prev.map((g) =>
                              g.key === group.key ? { ...g, category: e.target.value } : g
                            )
                          )
                        }
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                        disabled={busy}
                      >
                        {Object.entries(allCategories)
                          .filter(([key]) => key !== 'untagged')
                          .map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => skipGroup(group.key, 'new')}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600"
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      disabled={busy || !group.photoIds.length}
                      onClick={() => createFromGroup(group)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      {busy ? 'Creating…' : 'Create event'}
                    </button>
                  </div>
                </div>
                {renderPhotoGrid(group.photoIds, group.key, 'new', busy)}
              </section>
            );
          })}

          <section className="border border-dashed border-slate-300 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Images className="w-4 h-4 text-slate-500" />
              <h4 className="text-sm font-semibold text-slate-800">Unassigned</h4>
              <span className="text-xs text-slate-400">({unassigned.length})</span>
            </div>
            {unassigned.length === 0 ? (
              <p className="text-xs text-slate-400">None — all photos are in a group above.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {unassigned.map((id) => {
                  const photo = byId.get(id);
                  if (!photo) return null;
                  return (
                    <div key={id} className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      <img src={photo.url} alt={photo.name || ''} className="w-full h-full object-cover" />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg bg-white hover:bg-slate-50 text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
