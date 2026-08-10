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

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const kpis = await db.kPI.findMany({
      include: {
        values: {
          orderBy: {
            period: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Fetch KPIs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, description, target, unit, frequency } = await request.json();

    if (!name || target === undefined || !unit) {
      return NextResponse.json({ error: 'Name, target, and unit are required' }, { status: 400 });
    }

    const newKpi = await db.kPI.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        target: parseFloat(target),
        unit: unit.trim(),
        frequency: frequency || 'MONTHLY',
      },
      include: {
        values: true,
      },
    });

    return NextResponse.json(newKpi, { status: 201 });
  } catch (error: any) {
    console.error('Create KPI error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'KPI name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
