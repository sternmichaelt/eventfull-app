import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

function createStubClient(reason) {
  const reject = async () => { throw new Error(`Supabase not configured: ${reason}`); };
  const table = () => ({
    select: reject,
    insert: reject,
    update: reject,
    delete: reject,
    order: reject,
    eq: reject,
    single: reject
  });
  return {
    from: table,
    storage: {
      from: () => ({
        upload: reject,
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: reject
      })
    }
  };
}

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : createStubClient('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');

