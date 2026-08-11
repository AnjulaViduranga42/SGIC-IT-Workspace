import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runScheduler } from '@/lib/scheduler';
import { decrypt } from '@/lib/auth';

async function authorized(request: Request, allowSession: boolean) {
  const secret = process.env.CRON_SECRET;
  const urlKey = new URL(request.url).searchParams.get('key');
  const bearer = request.headers.get('authorization');
  if (secret && (urlKey === secret || bearer === `Bearer ${secret}`)) return true;
  if (!allowSession) return !secret;
  const token = (await cookies()).get('session')?.value;
  return Boolean(token && await decrypt(token));
}

export async function GET(request: Request) {
  try {
    if (!(await authorized(request, false))) {
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
    if (!(await authorized(request, true))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runScheduler();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
