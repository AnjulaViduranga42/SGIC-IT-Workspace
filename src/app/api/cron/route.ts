import { NextResponse } from 'next/server';
import { runScheduler } from '@/lib/scheduler';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const secret = process.env.CRON_SECRET;

    if (secret && key !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runScheduler();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const secret = process.env.CRON_SECRET;

    if (secret && key !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runScheduler();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
