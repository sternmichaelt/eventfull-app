import { supabase } from '../lib/supabase';

export const PHOTOS_BUCKET = 'photos';
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Check if Supabase is available
const checkSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }
};

// Get current user ID - requires authenticated user (UUID only)
const getUserId = async () => {
  checkSupabase();
  
  // Get authenticated user session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting auth session:', error);
    throw new Error('Authentication error. Please sign in.');
  }
  
  if (!session?.user?.id) {
    throw new Error('You must be signed in to use this feature. Please sign in or create an account.');
  }
  
  // Return authenticated user's UUID
  return session.user.id;
};

const isDataUrl = (url) => typeof url === 'string' && url.startsWith('data:');
const isHttpUrl = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);

const sanitizeFileName = (name) => {
  const base = (name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 120) || 'photo.jpg';
};

const extensionForMime = (mime) => {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
};

const storagePathFromPublicUrl = (url) => {
  if (!url || !isHttpUrl(url)) return null;
  const marker = `/storage/v1/object/public/${PHOTOS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
};

const mapEventRow = (e) => {
  const primaryPhoto = e.primary_photo || null;
  const primaryPhotoId = e.primary_photo_id != null ? e.primary_photo_id.toString() : null;
  const image =
    primaryPhoto?.url ||
    e.image_url ||
    e.image ||
    null;

  return {
    ...e,
    id: e.id.toString(),
    date: new Date(e.date),
    primary_photo_id: primaryPhotoId,
    primary_photo: primaryPhoto
      ? { ...primaryPhoto, id: primaryPhoto.id.toString() }
      : null,
    image,
    images: e.images || [],
    journals: e.journals || [],
    recordings: e.recordings || []
  };
};

const dataUrlToBlob = async (dataUrl) => {
  const res = await fetch(dataUrl);
  return res.blob();
};

const uploadBlobToStorage = async (blob, fileName, userId) => {
  const mime = blob.type || 'image/jpeg';
  if (!ALLOWED_PHOTO_TYPES.includes(mime)) {
    const err = new Error('Only JPEG, PNG, and WebP images are supported.');
    err.userMessage = err.message;
    throw err;
  }

  const safeName = sanitizeFileName(fileName);
  const hasExt = /\.[a-z0-9]+$/i.test(safeName);
  const finalName = hasExt ? safeName : `${safeName}.${extensionForMime(mime)}`;
  const path = `${userId}/${Date.now()}-${finalName}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, blob, {
      contentType: mime,
      upsert: false,
      cacheControl: '3600'
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    const err = new Error(uploadError.message || 'Failed to upload photo to storage');
    err.userMessage = 'Could not upload photo. Make sure the photos Storage bucket exists and you are signed in.';
    throw err;
  }

  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

// Events API
export async function fetchEvents(timelineId) {
  checkSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      primary_photo:photos!primary_photo_id (
        id,
        url,
        name,
        category
      )
    `)
    .eq('timeline_id', timelineId)
    .eq('user_id', userId)
    .order('date', { ascending: true });
  
  if (error) {
    // Fallback if FK join name differs on older schemas
    console.warn('fetchEvents with primary_photo join failed, retrying without join:', error.message);
    const retry = await supabase
      .from('events')
      .select('*')
      .eq('timeline_id', timelineId)
      .eq('user_id', userId)
      .order('date', { ascending: true });
    if (retry.error) {
      console.error('Error fetching events:', retry.error);
      return [];
    }
    return (retry.data || []).map(mapEventRow);
  }
  
  return (data || []).map(mapEventRow);
}

export async function createEvent(event) {
  checkSupabase();
  const userId = await getUserId();
  
  console.log('Creating event with userId:', userId, 'type:', typeof userId);
  
  const primaryPhotoId = event.primary_photo_id
    ? parseInt(event.primary_photo_id, 10)
    : null;
  // Prefer short Storage URL; never persist huge base64 on new writes when we have a photo id
  let imageUrl = event.image || event.image_url || null;
  if (isDataUrl(imageUrl) && primaryPhotoId) {
    imageUrl = null;
  }
  if (isDataUrl(imageUrl) && !primaryPhotoId) {
    // Last resort: keep until migration; prefer migrating via uploadPhotoFile in UI
    console.warn('createEvent received base64 image_url; prefer Storage uploads');
  }
  
  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: userId,
      timeline_id: event.timeline_id,
      title: event.title,
      description: event.description || null,
      date: event.date.toISOString(),
      category: event.category,
      importance: event.importance || 5,
      image_url: isDataUrl(imageUrl) ? null : imageUrl,
      primary_photo_id: primaryPhotoId,
      images: event.images || [],
      journals: event.journals || [],
      recordings: event.recordings || []
    })
    .select(`
      *,
      primary_photo:photos!primary_photo_id (
        id,
        url,
        name,
        category
      )
    `)
    .single();
  
  if (error) {
    console.error('Error creating event:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId: userId,
      userIdType: typeof userId
    });
    
    if (error.code === '23503' || error.message?.includes('foreign key') || error.message?.includes('user_id')) {
      error.userMessage = 'Database schema error: Please ensure user_id columns are UUID type and linked to auth.users';
    } else if (error.code === '42704' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      error.userMessage = 'Database table/column error: Please run supabase-photos-storage.sql in Supabase SQL Editor';
    } else if (error.message?.includes('invalid input syntax for type uuid')) {
      error.userMessage = 'Authentication required: Please sign in to use this feature';
    }
    
    throw error;
  }
  
  return mapEventRow(data);
}

export async function updateEvent(eventId, updates) {
  checkSupabase();
  
  const dbUpdates = { ...updates };
  if (dbUpdates.image !== undefined) {
    dbUpdates.image_url = isDataUrl(dbUpdates.image) ? null : dbUpdates.image;
    delete dbUpdates.image;
  }
  if (dbUpdates.image_url !== undefined && isDataUrl(dbUpdates.image_url)) {
    dbUpdates.image_url = null;
  }
  if (dbUpdates.primary_photo_id !== undefined && dbUpdates.primary_photo_id !== null) {
    dbUpdates.primary_photo_id = parseInt(dbUpdates.primary_photo_id, 10);
  }
  delete dbUpdates.primary_photo;
  delete dbUpdates.taggedPhotos;
  
  const { data, error } = await supabase
    .from('events')
    .update({
      ...dbUpdates,
      date: dbUpdates.date ? dbUpdates.date.toISOString() : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', parseInt(eventId))
    .select(`
      *,
      primary_photo:photos!primary_photo_id (
        id,
        url,
        name,
        category
      )
    `)
    .single();
  
  if (error) {
    console.error('Error updating event:', error);
    throw error;
  }
  
  return mapEventRow(data);
}

export async function deleteEvent(eventId) {
  checkSupabase();
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', parseInt(eventId));
  
  if (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

// Timelines API
export async function fetchTimelines() {
  checkSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('timelines')
    .select('*')
    .eq('user_id', userId) // Filter by user
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching timelines:', error);
    return [];
  }
  
  return data;
}

export async function createTimeline(timeline) {
  checkSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('timelines')
    .insert({
      id: timeline.id,
      user_id: userId,
      name: timeline.name,
      event_count: 0
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating timeline:', error);
    throw error;
  }
  
  return data;
}

export async function updateTimeline(timelineId, updates) {
  checkSupabase();
  const { data, error } = await supabase
    .from('timelines')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', timelineId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating timeline:', error);
    throw error;
  }
  
  return data;
}

export async function deleteTimeline(timelineId) {
  checkSupabase();
  const { error } = await supabase
    .from('timelines')
    .delete()
    .eq('id', timelineId);
  
  if (error) {
    console.error('Error deleting timeline:', error);
    throw error;
  }
}

// Shared timelines API
export async function fetchSharedTimelines() {
  checkSupabase();
  const userId = await getUserId();
  // Fetch timelines shared with current user OR owned by current user
  const { data, error } = await supabase
    .from('shared_timelines')
    .select('*')
    .or(`owner_user_id.eq.${userId},shared_with_email.eq.${userId}`);
  
  if (error) {
    console.error('Error fetching shared timelines:', error);
    return [];
  }
  
  return data;
}

export async function shareTimeline(timelineId, email) {
  checkSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('shared_timelines')
    .insert({
      timeline_id: timelineId,
      owner_user_id: userId,
      shared_with_email: email.toLowerCase()
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error sharing timeline:', error);
    throw error;
  }
  
  return data;
}

// User settings API
export async function fetchUserSettings() {
  checkSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching user settings:', error);
    return null;
  }
  
  return data;
}

export async function updateUserSettings(settings) {
  checkSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
  
  return data;
}

// Photos API
export async function fetchPhotos(category = null) {
  checkSupabase();
  const userId = await getUserId();
  
  let query = supabase
    .from('photos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
  
  return (data || []).map(p => ({
    ...p,
    id: p.id.toString()
  }));
}

/** @deprecated Prefer uploadPhotoFile for new uploads (stores real files in Storage). */
export async function createPhoto(photo) {
  checkSupabase();
  const userId = await getUserId();
  
  if (!photo.url || !photo.name) {
    throw new Error('Photo URL and name are required');
  }

  // If caller still passes base64, migrate into Storage first
  let url = photo.url;
  if (isDataUrl(url)) {
    const blob = await dataUrlToBlob(url);
    url = await uploadBlobToStorage(blob, photo.name, userId);
  }
  
  try {
    const { data, error } = await supabase
      .from('photos')
      .insert({
        user_id: userId,
        url,
        name: photo.name,
        category: photo.category || 'untagged'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating photo:', error);
      if (error.code === '23502' || error.message?.includes('null value')) {
        error.userMessage = 'User ID is missing. Please sign in to upload photos.';
      } else if (error.message?.includes('column') || error.message?.includes('does not exist')) {
        error.userMessage = 'Database schema error: Please run supabase-photos-storage.sql in Supabase.';
      }
      throw error;
    }
    
    return {
      ...data,
      id: data.id.toString()
    };
  } catch (err) {
    console.error('createPhoto error details:', err);
    throw err;
  }
}

/**
 * Upload a real image file to Supabase Storage and create a photos row.
 * Single source of truth for new pictures.
 */
export async function uploadPhotoFile(file, { name, category } = {}) {
  checkSupabase();
  const userId = await getUserId();

  if (!file) {
    throw new Error('No file provided');
  }

  const mime = file.type || '';
  if (!ALLOWED_PHOTO_TYPES.includes(mime)) {
    const err = new Error('Only JPEG, PNG, and WebP images are supported.');
    err.userMessage = err.message;
    throw err;
  }

  const fileName = name || file.name || `photo.${extensionForMime(mime)}`;
  const url = await uploadBlobToStorage(file, fileName, userId);

  const { data, error } = await supabase
    .from('photos')
    .insert({
      user_id: userId,
      url,
      name: fileName,
      category: category || 'untagged',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating photo after storage upload:', error);
    // Best-effort cleanup of orphaned storage object
    const path = storagePathFromPublicUrl(url);
    if (path) {
      await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
    }
    error.userMessage = error.userMessage || 'Failed to save photo record after upload.';
    throw error;
  }

  return {
    ...data,
    id: data.id.toString()
  };
}

export async function updatePhoto(photoId, updates) {
  checkSupabase();
  const { data, error } = await supabase
    .from('photos')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', parseInt(photoId))
    .select()
    .single();
  
  if (error) {
    console.error('Error updating photo:', error);
    throw error;
  }
  
  return {
    ...data,
    id: data.id.toString()
  };
}

export async function deletePhoto(photoId) {
  checkSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from('photos')
    .select('id, url')
    .eq('id', parseInt(photoId))
    .maybeSingle();

  if (fetchError) {
    console.error('Error loading photo before delete:', fetchError);
  }

  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', parseInt(photoId));
  
  if (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }

  const path = storagePathFromPublicUrl(existing?.url);
  if (path) {
    const { error: storageError } = await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
    if (storageError) {
      console.warn('Photo DB row deleted but storage file remove failed:', storageError.message);
    }
  }
}

/**
 * Move legacy base64 photos/covers into Storage and set primary_photo_id.
 * Safe to call multiple times; skips rows that already use http(s) URLs.
 */
export async function migrateLegacyPhotosToStorage() {
  checkSupabase();
  const userId = await getUserId();
  let migratedPhotos = 0;
  let migratedCovers = 0;

  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('id, url, name')
    .eq('user_id', userId);

  if (photosError) {
    console.error('migrateLegacyPhotosToStorage photos fetch error:', photosError);
  } else {
    for (const photo of photos || []) {
      if (!isDataUrl(photo.url)) continue;
      try {
        const blob = await dataUrlToBlob(photo.url);
        const url = await uploadBlobToStorage(blob, photo.name || `photo-${photo.id}.jpg`, userId);
        await supabase
          .from('photos')
          .update({ url, updated_at: new Date().toISOString() })
          .eq('id', photo.id);
        migratedPhotos += 1;
      } catch (err) {
        console.error(`Failed migrating photo ${photo.id}:`, err);
      }
    }
  }

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, category, image_url, primary_photo_id')
    .eq('user_id', userId);

  if (eventsError) {
    console.error('migrateLegacyPhotosToStorage events fetch error:', eventsError);
  } else {
    for (const event of events || []) {
      try {
        if (event.primary_photo_id && !isDataUrl(event.image_url)) {
          // Already has a primary; clear leftover base64 cache if any
          if (isDataUrl(event.image_url)) {
            await supabase
              .from('events')
              .update({ image_url: null, updated_at: new Date().toISOString() })
              .eq('id', event.id);
          }
          continue;
        }

        if (isDataUrl(event.image_url)) {
          const blob = await dataUrlToBlob(event.image_url);
          const fileName = `${event.title || 'cover'}-${event.id}.jpg`;
          const url = await uploadBlobToStorage(blob, fileName, userId);
          const { data: created, error: createErr } = await supabase
            .from('photos')
            .insert({
              user_id: userId,
              url,
              name: fileName,
              category: event.category || 'untagged'
            })
            .select()
            .single();
          if (createErr) throw createErr;

          await supabase.from('photo_events').insert(
            { photo_id: created.id, event_id: event.id }
          );

          await supabase
            .from('events')
            .update({
              primary_photo_id: created.id,
              image_url: url,
              updated_at: new Date().toISOString()
            })
            .eq('id', event.id);

          migratedCovers += 1;
          continue;
        }

        // HTTP cover URL but no primary_photo_id: link existing photo by URL or create stub row
        if (!event.primary_photo_id && isHttpUrl(event.image_url)) {
          const { data: match } = await supabase
            .from('photos')
            .select('id, url')
            .eq('user_id', userId)
            .eq('url', event.image_url)
            .maybeSingle();

          let photoId = match?.id;
          if (!photoId) {
            const { data: created, error: createErr } = await supabase
              .from('photos')
              .insert({
                user_id: userId,
                url: event.image_url,
                name: `${event.title || 'cover'}-${event.id}`,
                category: event.category || 'untagged'
              })
              .select()
              .single();
            if (createErr) throw createErr;
            photoId = created.id;
          }

          await supabase.from('photo_events').insert(
            { photo_id: photoId, event_id: event.id }
          );

          await supabase
            .from('events')
            .update({
              primary_photo_id: photoId,
              updated_at: new Date().toISOString()
            })
            .eq('id', event.id);

          migratedCovers += 1;
        }
      } catch (err) {
        console.error(`Failed migrating cover for event ${event.id}:`, err);
      }
    }
  }

  return { migratedPhotos, migratedCovers };
}

// Photo-Event tagging API
export async function tagPhotoToEvent(photoId, eventId) {
  checkSupabase();
  const { data, error } = await supabase
    .from('photo_events')
    .insert({
      photo_id: parseInt(photoId),
      event_id: parseInt(eventId)
    })
    .select()
    .single();
  
  if (error) {
    // Ignore duplicate tag
    if (error.code === '23505') {
      return null;
    }
    console.error('Error tagging photo to event:', error);
    throw error;
  }
  
  return data;
}

export async function untagPhotoFromEvent(photoId, eventId) {
  checkSupabase();
  const { error } = await supabase
    .from('photo_events')
    .delete()
    .eq('photo_id', parseInt(photoId))
    .eq('event_id', parseInt(eventId));
  
  if (error) {
    console.error('Error untagging photo from event:', error);
    throw error;
  }
}

export async function getPhotosForEvent(eventId) {
  checkSupabase();
  const { data, error } = await supabase
    .from('photo_events')
    .select(`
      photo_id,
      photos (
        id,
        url,
        name,
        category,
        created_at,
        updated_at
      )
    `)
    .eq('event_id', parseInt(eventId));
  
  if (error) {
    console.error('Error fetching photos for event:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data
    .filter(pe => pe.photos)
    .map(pe => ({
      ...pe.photos,
      id: pe.photos.id.toString()
    }));
}

export async function getEventsForPhoto(photoId) {
  checkSupabase();
  const { data, error } = await supabase
    .from('photo_events')
    .select(`
      event_id,
      events (
        id,
        title,
        description,
        date,
        category,
        importance,
        timeline_id
      )
    `)
    .eq('photo_id', parseInt(photoId));
  
  if (error) {
    console.error('Error fetching events for photo:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data
    .filter(pe => pe.events)
    .map(pe => ({
      ...pe.events,
      id: pe.events.id.toString(),
      date: new Date(pe.events.date)
    }));
}

