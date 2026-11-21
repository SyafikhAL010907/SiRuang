const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('FrontEnd/.env.local', 'utf8');
const lines = env.split('\n');
let url = '', key = '';
for (const line of lines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
}

const sb = createClient(url, key);

async function run() {
  const { data: rooms, error: errRooms } = await sb
    .from('chat_rooms')
    .select('id, user_identifier, participant_b_identifier, participant_b_role, room_type, last_message, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (errRooms) {
    console.error('Error fetching rooms:', errRooms);
    return;
  }
  console.log('ROOMS COUNT:', rooms.length);
  for (const r of rooms) {
    console.log(`ID: ${r.id} | A: ${r.user_identifier} | B: ${r.participant_b_identifier} | Type: ${r.room_type} | Last: "${r.last_message}" | Updated: ${r.updated_at}`);
  }

  // Cek user yang punya nama Revani
  const { data: users } = await sb.from('authentication').select('id, identifier, username, role');
  console.log('\nUSERS:');
  for (const u of users || []) {
    console.log(`ID: ${u.id} | Ident: ${u.identifier} | User: ${u.username} | Role: ${u.role}`);
  }
}

run();
