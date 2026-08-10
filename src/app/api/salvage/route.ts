import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseSalvageFile, SalvageLoginRow, SalvageStockRow } from '@/lib/salvage-import';

export const runtime = 'nodejs';
async function admin() { const token = (await cookies()).get('session')?.value; return token ? (await decrypt(token))?.role === 'ADMIN' : false; }

export async function GET() {
  try {
    if (!(await admin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [stock, users] = await Promise.all([
      db.salvageStockEntry.findMany({ orderBy: [{ entryDate: 'desc' }, { id: 'desc' }] }),
      db.salvageLoginUser.findMany({ orderBy: [{ lastLoginAt: 'desc' }, { userName: 'asc' }] }),
    ]);
    return NextResponse.json({ stock, users });
  } catch (error) { console.error('Salvage fetch error:', error); return NextResponse.json({ error: 'Unable to load Salvage data.' }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    if (!(await admin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const files = (await request.formData()).getAll('files').filter((item): item is File => item instanceof File);
    if (files.length !== 2) return NextResponse.json({ error: 'Select the Stock Ledger and User Login Log reports together.' }, { status: 400 });
    if (files.some((file) => file.size > 4 * 1024 * 1024)) return NextResponse.json({ error: 'Each report must be smaller than 4 MB.' }, { status: 413 });
    const parsed = await Promise.all(files.map(parseSalvageFile));
    const stockSheet = parsed.find((sheet) => sheet.kind === 'stock'); const loginSheet = parsed.find((sheet) => sheet.kind === 'login');
    if (!stockSheet || !loginSheet) return NextResponse.json({ error: 'Upload one Stock Ledger and one User Login Log report.' }, { status: 400 });
    const stock = stockSheet.rows as SalvageStockRow[]; const users = loginSheet.rows as SalvageLoginRow[];
    await db.$transaction(async (tx) => {
      await tx.salvageStockEntry.deleteMany(); await tx.salvageLoginUser.deleteMany();
      await tx.salvageLoginUser.createMany({ data: users });
      for (let offset = 0; offset < stock.length; offset += 1000) await tx.salvageStockEntry.createMany({ data: stock.slice(offset, offset + 1000) });
    }, { maxWait: 10_000, timeout: 30_000 });
    return NextResponse.json({ stockRows: stock.length, users: users.length, inbound: stock.reduce((sum, row) => sum + row.inQty, 0), rejected: stockSheet.rejected + loginSheet.rejected });
  } catch (error) { console.error('Salvage import error:', error); return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import reports.' }, { status: 400 }); }
}
