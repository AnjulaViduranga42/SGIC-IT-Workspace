import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { db } from '@/lib/db';
import { DmsIndexRow, DmsUserRow, parseDmsFile } from '@/lib/dms-import';

export const runtime = 'nodejs';

async function isAdmin() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return false;
  return (await decrypt(session))?.role === 'ADMIN';
}

export async function GET() {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [users, indexByMonth, indexByUser] = await Promise.all([
      db.dmsUser.findMany({ orderBy: [{ userName: 'asc' }, { id: 'asc' }] }),
      db.dmsIndexEntry.groupBy({ by: ['month'], _sum: { documentCount: true }, _count: { _all: true } }),
      db.dmsIndexEntry.groupBy({ by: ['userId'], _sum: { documentCount: true }, _count: { _all: true } }),
    ]);
    return NextResponse.json({ users, indexByMonth, indexByUser });
  } catch (error) {
    console.error('DMS fetch error:', error);
    return NextResponse.json({ error: 'Unable to load DMS data.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const formData = await request.formData();
    const files = formData.getAll('files').filter((item): item is File => item instanceof File);
    if (files.length !== 2) return NextResponse.json({ error: 'Select both DMS Excel reports.' }, { status: 400 });
    if (files.some((file) => file.size > 4 * 1024 * 1024)) {
      return NextResponse.json({ error: 'Each report must be smaller than 4 MB.' }, { status: 413 });
    }

    const parsed = await Promise.all(files.map(parseDmsFile));
    const userSheet = parsed.find((sheet) => sheet.kind === 'users');
    const indexSheet = parsed.find((sheet) => sheet.kind === 'index');
    if (!userSheet || !indexSheet) {
      return NextResponse.json({ error: 'Upload one DMS index report and one DMS user details report.' }, { status: 400 });
    }
    const users = userSheet.rows as DmsUserRow[];
    const indexRows = indexSheet.rows as DmsIndexRow[];
    if (!users.length || !indexRows.length) return NextResponse.json({ error: 'The reports contain no valid data.' }, { status: 400 });

    await db.$transaction(async (tx) => {
      await tx.dmsIndexEntry.deleteMany();
      await tx.dmsUser.deleteMany();
      await tx.dmsUser.createMany({ data: users });
      for (let offset = 0; offset < indexRows.length; offset += 1000) {
        await tx.dmsIndexEntry.createMany({ data: indexRows.slice(offset, offset + 1000) });
      }
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json({
      users: users.length,
      indexRows: indexRows.length,
      documents: indexRows.reduce((sum, row) => sum + row.documentCount, 0),
      rejected: userSheet.rejected + indexSheet.rejected,
    });
  } catch (error) {
    console.error('DMS import error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import DMS reports.' }, { status: 400 });
  }
}
