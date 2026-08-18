import { NextResponse } from 'next/server';
import { runDailyAutomation } from '@src/scheduler';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await runDailyAutomation('manual');
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
