// Test Supabase connectivity
import { supabase } from '../lib/supabase';

export async function testSupabaseConnection() {
  const results = {
    connected: false,
    tables: {},
    errors: []
  };

  try {
    // Test basic connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('timelines')
      .select('count')
      .limit(1);

    if (healthError) {
      results.errors.push(`Connection test failed: ${healthError.message}`);
      return results;
    }

    results.connected = true;

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
        } else {
          results.tables[table] = { accessible: true };
        }
      } catch (err) {
        results.tables[table] = { accessible: false, error: err.message };
      }
    }

  } catch (err) {
    results.errors.push(`Connection error: ${err.message}`);
  }

  return results;
}

