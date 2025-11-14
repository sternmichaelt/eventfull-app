// Test Supabase connectivity - can be called from browser console
import { supabase } from '../lib/supabase';

export async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  const results = {
    connected: false,
    tables: {},
    errors: []
  };

  try {
    if (!supabase) {
      results.errors.push('Supabase client not initialized');
      return results;
    }

    // Test basic connection with timelines table
    const { data: timelines, error: timelineError } = await supabase
      .from('timelines')
      .select('count')
      .limit(1);

    if (timelineError) {
      results.errors.push(`Connection failed: ${timelineError.message}`);
      return results;
    }

    results.connected = true;
    console.log('✅ Supabase connection successful');

    // Test each table
    const tables = ['events', 'timelines', 'photos', 'photo_events', 'user_settings', 'shared_timelines'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          results.tables[table] = { accessible: false, error: error.message };
          console.error(`❌ ${table}: ${error.message}`);
        } else {
          results.tables[table] = { accessible: true };
          console.log(`✅ ${table}: accessible`);
        }
      } catch (err) {
        results.tables[table] = { accessible: false, error: err.message };
        console.error(`❌ ${table}: ${err.message}`);
      }
    }

    // Test API functions (imported dynamically to avoid circular dependencies)
    console.log('🔍 Testing API functions...');
    try {
      const { fetchTimelines } = await import('../api/events');
      const timelines = await fetchTimelines();
      console.log(`✅ fetchTimelines: ${timelines.length} timelines found`);
    } catch (err) {
      console.error(`❌ fetchTimelines failed: ${err.message}`);
    }

    try {
      const { fetchPhotos } = await import('../api/events');
      const photos = await fetchPhotos();
      console.log(`✅ fetchPhotos: ${photos.length} photos found`);
    } catch (err) {
      console.error(`❌ fetchPhotos failed: ${err.message}`);
    }

  } catch (err) {
    results.errors.push(`Connection error: ${err.message}`);
    console.error('❌ Connection error:', err);
  }

  return results;
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
  window.testSupabaseConnection = testConnection;
}

