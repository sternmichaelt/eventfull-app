// Debug utility to check Supabase configuration and connection
// Call this from browser console: window.debugSupabase()

import { supabase } from '../lib/supabase';

export async function debugSupabase() {
  console.log('🔍 Supabase Debug Information');
  console.log('============================');
  
  // Check environment variables
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
  
  console.log('\n1. Environment Variables:');
  console.log('   REACT_APP_SUPABASE_URL:', url ? '✅ Set' : '❌ Missing');
  console.log('   REACT_APP_SUPABASE_ANON_KEY:', key ? '✅ Set' : '❌ Missing');
  if (url) {
    console.log('   URL:', url);
  }
  if (key) {
    console.log('   Key (first 20 chars):', key.substring(0, 20) + '...');
  }
  
  // Check Supabase client
  console.log('\n2. Supabase Client:');
  console.log('   Initialized:', supabase ? '✅ Yes' : '❌ No');
  
  if (!supabase) {
    console.error('\n❌ Supabase client is null. Check environment variables.');
    return;
  }
  
  // Test connection
  console.log('\n3. Testing Connection:');
  try {
    const { data, error } = await supabase
      .from('timelines')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('   ❌ Connection failed:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error details:', error.details);
      console.error('   Error hint:', error.hint);
      
      // Common error messages
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.error('\n   💡 Solution: Run supabase-setup.sql in Supabase SQL Editor');
      } else if (error.message.includes('permission') || error.message.includes('policy')) {
        console.error('\n   💡 Solution: Check RLS policies - they should allow all (USING true)');
      } else if (error.message.includes('JWT') || error.message.includes('invalid')) {
        console.error('\n   💡 Solution: Check your REACT_APP_SUPABASE_ANON_KEY is correct');
      }
    } else {
      console.log('   ✅ Connection successful');
    }
  } catch (err) {
    console.error('   ❌ Connection error:', err.message);
  }
  
  // Test each table
  console.log('\n4. Testing Tables:');
  const tables = ['events', 'timelines', 'photos', 'photo_events', 'user_settings', 'shared_timelines'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`   ❌ ${table}:`, error.message);
      } else {
        console.log(`   ✅ ${table}: accessible`);
      }
    } catch (err) {
      console.error(`   ❌ ${table}:`, err.message);
    }
  }
  
  // Check schema
  console.log('\n5. Schema Check:');
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('user_id')
      .limit(1);
    
    if (!error && events && events.length > 0) {
      const userId = events[0].user_id;
      const userIdType = typeof userId;
      console.log('   user_id sample:', userId);
      console.log('   user_id type:', userIdType);
      
      if (userIdType !== 'string' && !userId?.startsWith('guest-') && !userId?.match(/^[0-9a-f]{8}-/)) {
        console.warn('   ⚠️ user_id might not be TEXT type');
      } else {
        console.log('   ✅ user_id appears to be TEXT');
      }
    }
  } catch (err) {
    console.error('   ❌ Could not check schema:', err.message);
  }
  
  console.log('\n============================');
  console.log('Debug complete. Check errors above.');
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.debugSupabase = debugSupabase;
}

