import React, { useMemo, useRef, useState, useEffect } from 'react';
import { X, List, Camera, Search } from 'lucide-react';

function formatDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getAgeAtEvent(eventDate, birthDate) {
  if (!eventDate || !birthDate) return null;
  const ed = eventDate instanceof Date ? eventDate : new Date(eventDate);
  const bd = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(ed.getTime()) || Number.isNaN(bd.getTime())) return null;
  let age = ed.getFullYear() - bd.getFullYear();
  const monthDiff = ed.getMonth() - bd.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ed.getDate() < bd.getDate())) {
    age -= 1;
  }
  return age;
}

function getDisplayImage(event) {
  const eventPhotos = event.taggedPhotos || [];
  return event.image || (eventPhotos.length > 0 ? eventPhotos[0].url : null);
}

function getPhotoCount(event) {
  const eventPhotos = event.taggedPhotos || [];
  const urls = new Set(eventPhotos.map((p) => p.url).filter(Boolean));
  return (
    eventPhotos.length +
    (event.image && !urls.has(event.image) && !event.primary_photo_id ? 1 : 0)
  );
}

function AllEventsListModal({
  events = [],
  selectedCategories,
  onToggleCategory,
  onSelectAll,
  onClose,
  allCategories = {},
  onEditEvent,
  onOpenGallery,
  birthDate = null,
}) {
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const categoryKeys = Object.keys(allCategories);

  const sortedFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...events]
      .filter((e) => selectedCategories.has(e.category))
      .filter((e) => {
        if (!q) return true;
        return (
          (e.title || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const db = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return da - db;
      });
  }, [events, selectedCategories, search]);

  const yearGroups = useMemo(() => {
    const groups = [];
    let currentYear = null;
    let bucket = null;
    for (const event of sortedFiltered) {
      const d = event.date instanceof Date ? event.date : new Date(event.date);
      const year = Number.isNaN(d.getTime()) ? 'Unknown' : d.getFullYear();
      if (year !== currentYear) {
        currentYear = year;
        bucket = { year, events: [] };
        groups.push(bucket);
      }
      bucket.events.push(event);
    }
    return groups;
  }, [sortedFiltered]);

  const years = yearGroups.map((g) => g.year);

  const jumpToYear = (year) => {
    const el = document.getElementById(`events-year-${year}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const categoryFilteredCount = events.filter((e) => selectedCategories.has(e.category)).length;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        visible ? 'bg-black/80 opacity-100' : 'bg-black/80 opacity-0'
      }`}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-w-screen-2xl max-h-[92vh] flex flex-col overflow-hidden transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <List className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">All Events</h3>
            <span className="text-sm text-gray-500">
              {sortedFiltered.length} of {categoryFilteredCount} shown
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b shrink-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="px-3 py-1 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
              title="Select all categories"
            >
              Select All
            </button>
            {categoryKeys.map((key) => {
              const config = allCategories[key];
              const active = selectedCategories.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleCategory(key)}
                  className={`px-3 py-1 rounded-full border text-sm flex items-center gap-1.5 ${
                    active ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${config?.color || 'bg-gray-400'}`} />
                  {config?.label || key}
                </button>
              );
            })}
            <div className="ml-auto relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded text-sm w-56 md:w-72"
                placeholder="Search title or description..."
              />
            </div>
          </div>

          {years.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => jumpToYear(year)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
          {sortedFiltered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-600">
              {events.length === 0
                ? 'No events yet. Add your first event to get started.'
                : 'No events match your search or filters.'}
            </div>
          ) : (
            <div className="pb-6">
              {yearGroups.map((group) => (
                <div key={group.year} id={`events-year-${group.year}`}>
                  <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-y border-slate-200 px-4 py-2">
                    <h4 className="text-sm font-semibold text-slate-700 tracking-wide">{group.year}</h4>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {group.events.map((event) => {
                      const config = allCategories[event.category] || allCategories.milestone;
                      const Icon = config?.icon;
                      const displayImage = getDisplayImage(event);
                      const photoCount = getPhotoCount(event);
                      const age = getAgeAtEvent(event.date, birthDate);

                      return (
                        <li key={event.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => onEditEvent?.(event)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onEditEvent?.(event);
                              }
                            }}
                            className="flex items-stretch gap-3 md:gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors group"
                          >
                            <div
                              className={`w-1 self-stretch rounded-full shrink-0 ${config?.color || 'bg-gray-400'}`}
                            />

                            <button
                              type="button"
                              title={photoCount > 0 ? `View ${photoCount} photo(s)` : 'No photos yet'}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (photoCount > 0 || displayImage) {
                                  onOpenGallery?.(event);
                                }
                              }}
                              className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative border border-gray-200"
                            >
                              {displayImage ? (
                                <img
                                  src={displayImage}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div
                                  className={`w-full h-full flex items-center justify-center ${config?.color || 'bg-gray-400'}`}
                                >
                                  {Icon && <Icon className="w-7 h-7 text-white" />}
                                </div>
                              )}
                              {photoCount > 0 && (
                                <span className="absolute bottom-1 right-1 bg-slate-800/75 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Camera className="w-2.5 h-2.5" />
                                  {photoCount}
                                </span>
                              )}
                            </button>

                            <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                              <div className="flex items-start justify-between gap-3">
                                <h5 className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                                  {event.title}
                                </h5>
                                <div className="text-right shrink-0">
                                  <div className="text-sm text-gray-600 whitespace-nowrap">
                                    {formatDate(event.date)}
                                  </div>
                                  {age != null && (
                                    <div className="text-xs text-gray-400">Age {age}</div>
                                  )}
                                </div>
                              </div>
                              {event.description && (
                                <p className="text-sm text-gray-500 line-clamp-1">{event.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                                  {Icon && <Icon className="w-3.5 h-3.5" />}
                                  {config?.label || event.category}
                                </span>
                                <div className="flex gap-0.5 items-center" title={`Importance ${event.importance}`}>
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <span
                                      key={i}
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        i < (event.importance || 0) / 2 ? 'bg-yellow-400' : 'bg-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AllEventsListModal;
