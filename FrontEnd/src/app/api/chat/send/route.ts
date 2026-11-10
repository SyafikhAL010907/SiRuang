import { NextResponse, after } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { notifyRecipient } from '@/lib/sendPush';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roomId = body.room_id;
    const senderIdentifier = body.sender_identifier || body.sender_gmail;
    let message = body.message?.trim() || '';
    let messageType = body.message_type || 'text';

    if (!roomId || !senderIdentifier || !message) {
      return NextResponse.json({ error: 'Data pesan tidak lengkap' }, { status: 400 });
    }

    if (message.startsWith('{"files"') || message.startsWith('{"files":')) {
      messageType = 'multi_file';
    }

    // 1. Simpan pesan ke chat_messages di Supabase secara cepat
    const { data: insertedMsg, error: insertError } = await supabaseServer
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_identifier: senderIdentifier,
        message,
        message_type: messageType,
        is_read: false,
      })
      .select('id, room_id, sender_identifier, message, message_type, created_at, is_read')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Gagal menyimpan pesan: ' + insertError.message }, { status: 500 });
    }

    // 2. Ringkasan last_message
    let lastMsg = message;
    if (messageType === 'image') {
      lastMsg = '🖼️ Gambar';
    } else if (messageType === 'file') {
      lastMsg = '📄 Dokumen';
    } else if (messageType === 'multi_file') {
      lastMsg = '📎 Lampiran File';
    }

    // 3. Update last_message di chat_rooms
    await supabaseServer
      .from('chat_rooms')
      .update({
        last_message: lastMsg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId);

    // 4. Background fire-and-forget ML Trigger dengan AbortSignal timeout 1 detik
    const mlUrl = process.env.ML_SERVICE_URL;
    if (mlUrl && messageType === 'text' && message.length >= 3) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      fetch(`${mlUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, room_id: roomId }),
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then(async (mlData) => {
          clearTimeout(timeoutId);
          if (mlData && mlData.confidence >= 0.35 && mlData.reply_text) {
            const replyText = mlData.human_note
              ? `${mlData.reply_text}\n\n📝 Catatan Tambahan:\n${mlData.human_note}`
              : mlData.reply_text;

            await supabaseServer.from('chat_messages').insert({
              room_id: roomId,
              sender_identifier: 'admin_ai',
              message: replyText,
              message_type: 'text',
              is_read: false,
            });

            await supabaseServer
              .from('chat_rooms')
              .update({
                last_message: replyText.substring(0, 100),
                updated_at: new Date().toISOString(),
              })
              .eq('id', roomId);

            // Web Push notification untuk bot reply (fire-and-forget, jangan after())
            try {
              await notifyRecipient(Number(roomId), 'admin_ai', replyText.substring(0, 200), 'text');
            } catch {}
          }
        })
        .catch(() => {
          clearTimeout(timeoutId);
          // ML Service tidak aktif / timeout, abaikan secara senyap
        });
    }

    // Web Push notification untuk pesan biasa (serverless-safe via after())
    after(async () => {
      try {
        await notifyRecipient(Number(roomId), senderIdentifier, message, messageType);
      } catch {}
    });

    // Langsung return detik itu juga!
    return NextResponse.json({
      ...insertedMsg,
      sender_gmail: insertedMsg.sender_identifier,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
