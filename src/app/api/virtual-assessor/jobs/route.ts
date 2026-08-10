import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/auth';
import { parseVirtualAssessorFile } from '@/lib/virtual-assessor-import';

export const runtime = 'nodejs';

async function getAdmin() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  const user = await decrypt(session);
  return user?.role === 'ADMIN' ? user : null;
}

export async function GET() {
  try {
    if (!(await getAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await db.virtualAssessorJob.findMany({
      orderBy: [{ jobDate: 'desc' }, { id: 'desc' }],
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Virtual Assessor jobs fetch error:', error);
    return NextResponse.json({ error: 'Unable to load Virtual Assessor jobs.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Please select an Excel report.' }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'The report must be smaller than 4 MB.' }, { status: 413 });
    }

    const { rows, rejected } = await parseVirtualAssessorFile(file);
    if (!rows.length) {
      return NextResponse.json(
        { error: 'No valid rows were found. Ref. No, Agent Id, and Job Date are required.', rejected },
        { status: 400 }
      );
    }

    const result = await db.virtualAssessorJob.createMany({ data: rows, skipDuplicates: true });

    return NextResponse.json({
      imported: result.count,
      duplicates: rows.length - result.count,
      rejected: rejected.length,
      totalRows: rows.length + rejected.length,
    });
  } catch (error) {
    console.error('Virtual Assessor import error:', error);
    const message = error instanceof Error ? error.message : 'Unable to import the report.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await getAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get('all') === 'true') {
      const result = await db.virtualAssessorJob.deleteMany();
      return NextResponse.json({ deleted: result.count });
    }

    const id = Number(searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'A valid record ID is required.' }, { status: 400 });
    }

    await db.virtualAssessorJob.delete({ where: { id } });
    return NextResponse.json({ deleted: 1 });
  } catch (error) {
    console.error('Virtual Assessor delete error:', error);
    return NextResponse.json({ error: 'Unable to delete the selected record.' }, { status: 500 });
  }
}
