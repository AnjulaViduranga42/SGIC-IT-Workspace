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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const kpiId = parseInt(id);

    if (isNaN(kpiId)) {
      return NextResponse.json({ error: 'Invalid KPI ID' }, { status: 400 });
    }

    const { name, description, target, unit, frequency } = await request.json();

    const updatedKpi = await db.kPI.update({
      where: { id: kpiId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        target: target !== undefined ? parseFloat(target) : undefined,
        unit: unit !== undefined ? unit.trim() : undefined,
        frequency: frequency !== undefined ? frequency : undefined,
      },
    });

    return NextResponse.json(updatedKpi);
  } catch (error) {
    console.error('Update KPI error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const kpiId = parseInt(id);

    if (isNaN(kpiId)) {
      return NextResponse.json({ error: 'Invalid KPI ID' }, { status: 400 });
    }

    await db.kPI.delete({
      where: { id: kpiId },
    });

    return NextResponse.json({ success: true, message: 'KPI deleted successfully' });
  } catch (error) {
    console.error('Delete KPI error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
