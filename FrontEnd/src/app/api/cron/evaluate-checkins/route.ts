import { NextResponse } from 'next/server';
import { evaluateBookingStates } from '@/lib/bookingEvaluator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
    }

    await evaluateBookingStates();

    return NextResponse.json({
      success: true,
      message: 'Status check-in dan booking berhasil dievaluasi.',
      evaluated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal cron error: ' + err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

