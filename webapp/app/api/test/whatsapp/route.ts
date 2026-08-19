import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, target } = body;

    const baseUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE;

    if (!baseUrl || !apiKey || !instance) {
      return NextResponse.json({
        success: false,
        error: 'Configurações da Evolution API incompletas (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE)',
      }, { status: 500 });
    }

    const targets = target ? [target] : [];
    if (targets.length === 0) {
      // Buscar contatos ativos do Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://grpkjytyniohtqgbabkw.supabase.co';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      try {
        const contactsRes = await fetch(
          `${supabaseUrl}/rest/v1/contacts?is_active=eq.true&select=target_id`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        );
        const contacts = await contactsRes.json();
        if (Array.isArray(contacts)) {
          contacts.forEach((c: any) => targets.push(c.target_id));
        }
      } catch {
        // fallback - no contacts
      }
    }

    if (targets.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum destinatário definido' }, { status: 400 });
    }

    const results = [];
    for (const t of targets) {
      const url = `${baseUrl}/message/sendText/${instance}`;

      // Try v2 format first, then v1
      const payloads = [
        { number: t, text: message },
        { number: t, options: { delay: 1200, presence: 'composing' }, textMessage: { text: message } },
      ];

      let sent = false;
      for (const payload of payloads) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: apiKey },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            results.push({ target: t, success: true });
            sent = true;
            break;
          }
        } catch {
          // try next payload format
        }
      }

      if (!sent) {
        results.push({ target: t, success: false, error: 'Todos os formatos falharam' });
      }
    }

    const ok = results.some((r) => r.success);
    return NextResponse.json({ success: ok, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
