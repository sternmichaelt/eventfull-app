import { supabase } from '../lib/supabase';

// Check if Supabase is available
const checkSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }
};

// Get current user ID (for now using localStorage, will be replaced with auth later)
const getUserId = () => {
  let userId = localStorage.getItem('eventfull:userId');
  if (!userId) {
    userId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem('eventfull:userId', userId);
  }
  return userId;
};

// Events API
export async function fetchEvents(timelineId) {
  checkSupabase();
  // eslint-disable-next-line no-unused-vars
  const userId = getUserId(); // Stored for future use with proper auth
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('timeline_id', timelineId)
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }
  
  return data.map(e => ({
    ...e,
    id: e.id.toString(), // Convert numeric ID to string for consistency
    date: new Date(e.date),
    images: e.images || [],
    journals: e.journals || [],
    recordings: e.recordings || []
  }));
}

export async function createEvent(event) {
  checkSupabase();
  const userId = getUserId();
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
      image_url: event.image || null,
      images: event.images || [],
      journals: event.journals || [],
      recordings: event.recordings || []
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating event:', error);
    throw error;
  }
  
  return {
    ...data,
    id: data.id.toString(), // Convert numeric ID to string for consistency
    date: new Date(data.date),
    images: data.images || [],
    journals: data.journals || [],
    recordings: data.recordings || []
  };
}

export async function updateEvent(eventId, updates) {
  checkSupabase();
  const { data, error } = await supabase
    .from('events')
    .update({
      ...updates,
      date: updates.date ? updates.date.toISOString() : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', parseInt(eventId)) // Convert string ID to number for Supabase
    .select()
    .single();
  
  if (error) {
    console.error('Error updating event:', error);
    throw error;
  }
  
  return {
    ...data,
    id: data.id.toString(), // Convert numeric ID to string for consistency
    date: new Date(data.date),
    images: data.images || [],
    journals: data.journals || [],
    recordings: data.recordings || []
  };
}

export async function deleteEvent(eventId) {
  checkSupabase();
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', parseInt(eventId)); // Convert string ID to number for Supabase
  
  if (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

// Timelines API
export async function fetchTimelines() {
  checkSupabase();
  const userId = getUserId();
  const { data, error } = await supabase
    .from('timelines')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching timelines:', error);
    return [];
  }
  
  return data;
}

export async function createTimeline(timeline) {
  checkSupabase();
  const userId = getUserId();
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
  // eslint-disable-next-line no-unused-vars
  const userId = getUserId(); // Stored for future use with proper auth
  // This will need to be updated when we have proper auth
  const { data, error } = await supabase
    .from('shared_timelines')
    .select('*');
  
  if (error) {
    console.error('Error fetching shared timelines:', error);
    return [];
  }
  
  return data;
}

export async function shareTimeline(timelineId, email) {
  checkSupabase();
  const userId = getUserId();
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
  const userId = getUserId();
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
  const userId = getUserId();
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
  const userId = getUserId();
  let query = supabase
    .from('photos')
    .select('*')
    .eq('user_id', userId) // Filter by current user
    .order('created_at', { ascending: false });
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
  
  return data.map(p => ({
    ...p,
    id: p.id.toString()
  }));
}

export async function createPhoto(photo) {
  checkSupabase();
  const userId = getUserId();
  
  // Validate required fields
  if (!photo.url || !photo.name) {
    throw new Error('Photo URL and name are required');
  }
  
  try {
    const { data, error } = await supabase
      .from('photos')
      .insert({
        user_id: userId,
        url: photo.url,
        name: photo.name,
        category: photo.category || 'untagged'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating photo:', error);
      console.error('Photo data:', { userId, name: photo.name, category: photo.category });
      throw error;
    }
    
    return {
      ...data,
      id: data.id.toString()
    };
  } catch (err) {
    console.error('createPhoto error details:', {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
      userId,
      photoName: photo.name
    });
    throw err;
  }
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
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', parseInt(photoId));
  
  if (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
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
    .filter(pe => pe.photos) // Filter out any null photos
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
    .filter(pe => pe.events) // Filter out any null events
    .map(pe => ({
      ...pe.events,
      id: pe.events.id.toString(),
      date: new Date(pe.events.date)
    }));
}

