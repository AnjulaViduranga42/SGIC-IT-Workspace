import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/auth';

async function getSessionUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { kpiId, period, targetValue, actualValue } = await request.json();

    if (!kpiId || !period || targetValue === undefined || actualValue === undefined) {
      return NextResponse.json({ error: 'KPI ID, period, target value, and actual value are required' }, { status: 400 });
    }

    const parsedKpiId = parseInt(kpiId);
    const parsedTarget = parseFloat(targetValue);
    const parsedActual = parseFloat(actualValue);

    // Upsert KPI Value
    const kpiValue = await db.kPIValue.upsert({
      where: {
        kpiId_period: {
          kpiId: parsedKpiId,
          period: period.trim(),
        },
      },
      update: {
        targetValue: parsedTarget,
        actualValue: parsedActual,
      },
      create: {
        kpiId: parsedKpiId,
        period: period.trim(),
        targetValue: parsedTarget,
        actualValue: parsedActual,
      },
    });

    return NextResponse.json(kpiValue);
  } catch (error) {
    console.error('Record KPI value error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
