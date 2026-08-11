import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { db } from '@/lib/db';

async function authorized() { const token = (await cookies()).get('session')?.value; const payload = token ? await decrypt(token) : null; if (!payload) return false; return Boolean(await db.user.findFirst({ where: { id: Number(payload.id), isActive: true } })); }
export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [staff, activeUsers] = await Promise.all([
    db.person.findMany({ orderBy: { name: 'asc' } }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
  ]);
  const staffEmails = new Set(staff.map((person) => person.email.toLowerCase()));
  const workspaceUsers = activeUsers
    .filter((user) => !staffEmails.has(user.email.toLowerCase()))
    .map((user) => ({ id: -user.id, name: user.name, email: user.email }));
  return NextResponse.json([...staff, ...workspaceUsers].sort((a, b) => a.name.localeCompare(b.name)));
}
export async function POST(request: Request) { try { if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 }); const { name, email } = await request.json(); if (!name?.trim() || !email?.trim()) return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 }); return NextResponse.json(await db.person.create({ data: { name: name.trim(), email: email.toLowerCase().trim() } }), { status: 201 }); } catch { return NextResponse.json({ error: 'Unable to add staff. Check that the email is unique.' }, { status: 400 }); } }
export async function PUT(request: Request) { try { if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 }); const { id, name, email } = await request.json(); if (!name?.trim() || !email?.trim()) return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 }); return NextResponse.json(await db.person.update({ where: { id: Number(id) }, data: { name: name.trim(), email: email.toLowerCase().trim() } })); } catch { return NextResponse.json({ error: 'Unable to update staff. Check that the email is unique.' }, { status: 400 }); } }
export async function DELETE(request: Request) { try { if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 }); const id = Number(new URL(request.url).searchParams.get('id')); await db.person.delete({ where: { id } }); return NextResponse.json({ deleted: 1 }); } catch { return NextResponse.json({ error: 'Unable to delete staff member.' }, { status: 400 }); } }
