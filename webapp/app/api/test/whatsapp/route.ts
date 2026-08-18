import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@src/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const targets = body.target ? [body.target] : [];
    const results = await sendWhatsAppMessage(body.message, targets);

    const ok = results && results.some((r: any) => r.success);
    return NextResponse.json({ success: ok, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
