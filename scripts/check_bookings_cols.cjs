const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'FrontEnd/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('bookings').select('*').limit(1);
  if (error) {
    console.error('Error fetching bookings:', error);
  } else {
    console.log('Bookings columns:', Object.keys(data[0] || {}));
  }

  // Check course_relations
  const { data: rels, error: relErr } = await supabase.from('course_relations').select('*');
  console.log('Course relations count:', rels?.length, 'data:', rels);
}

check();

