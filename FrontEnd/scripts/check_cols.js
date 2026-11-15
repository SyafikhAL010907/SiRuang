const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
  const { data, error } = await supabase.from('bookings').select('*').limit(1);
  if (error) console.error('Bookings error:', error);
  else console.log('Bookings columns:', Object.keys(data[0] || {}));

  const { data: rels, error: relErr } = await supabase.from('course_relations').select('*');
  console.log('Course relations count:', rels ? rels.length : 0);
  if (rels && rels.length > 0) {
    console.log('Sample relation:', rels[0]);
  }

  // Also check PJ Kelas user ID 4 (identifier: 1313620099)
  const { data: pjUser } = await supabase.from('v_user_profiles').select('*').eq('identifier', '1313620099').single();
  console.log('PJ User:', pjUser ? { id: pjUser.user_id, role: pjUser.role, name: pjUser.full_name } : 'None');

  // Check Dosen user ID 3 (identifier: 197805152005011002)
  const { data: dosenUser } = await supabase.from('v_user_profiles').select('*').eq('identifier', '197805152005011002').single();
  console.log('Dosen User:', dosenUser ? { id: dosenUser.user_id, role: dosenUser.role, name: dosenUser.full_name } : 'None');
}

run();

