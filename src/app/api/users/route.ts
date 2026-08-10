import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { db } from '@/lib/db';

const ROOT_EMAIL = 'admin@sgic.lk';
async function actor() { const token = (await cookies()).get('session')?.value; const payload = token ? await decrypt(token) : null; return payload ? db.user.findUnique({ where: { id: Number(payload.id) } }) : null; }
const publicSelect = { id: true, email: true, name: true, role: true, isSuperAdmin: true, isActive: true, createdAt: true, updatedAt: true } as const;

export async function GET() {
  const current = await actor(); if (!current?.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  return NextResponse.json(await db.user.findMany({ select: publicSelect, orderBy: [{ isSuperAdmin: 'desc' }, { name: 'asc' }] }));
}

export async function POST(request: Request) {
  try {
    const current = await actor(); if (!current?.isSuperAdmin || !current.isActive) return NextResponse.json({ error: 'Only the Super Admin can create administrators.' }, { status: 403 });
    const { email, password, name } = await request.json();
    if (!name?.trim() || !email?.trim() || typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'Name, email, and a password of at least 8 characters are required.' }, { status: 400 });
    const normalizedEmail = email.toLowerCase().trim();
    if (await db.user.findUnique({ where: { email: normalizedEmail } })) return NextResponse.json({ error: 'An administrator with this email already exists.' }, { status: 409 });
    const user = await db.user.create({ data: { name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 10), role: 'ADMIN' }, select: publicSelect });
    return NextResponse.json(user, { status: 201 });
  } catch (error) { console.error('Create user error:', error); return NextResponse.json({ error: 'Unable to create administrator.' }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    const current = await actor(); if (!current?.isSuperAdmin || !current.isActive) return NextResponse.json({ error: 'Only the Super Admin can maintain administrators.' }, { status: 403 });
    const { id, name, email, password, isActive } = await request.json(); const targetId = Number(id);
    const target = await db.user.findUnique({ where: { id: targetId } }); if (!target) return NextResponse.json({ error: 'Administrator not found.' }, { status: 404 });
    const isRoot = target.email === ROOT_EMAIL;
    if (isRoot && (isActive === false || (email && email.toLowerCase().trim() !== ROOT_EMAIL))) return NextResponse.json({ error: 'The default Super Admin cannot be disabled or renamed.' }, { status: 400 });
    const normalizedEmail = email?.toLowerCase().trim();
    if (!name?.trim() || !normalizedEmail) return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    if (password && password.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
    const updated = await db.user.update({ where: { id: targetId }, data: { name: name.trim(), email: normalizedEmail, isActive: isRoot ? true : Boolean(isActive), ...(password ? { password: await bcrypt.hash(password, 10) } : {}) }, select: publicSelect });
    return NextResponse.json(updated);
  } catch (error) { console.error('Update user error:', error); return NextResponse.json({ error: 'Unable to update administrator. Check that the email is unique.' }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const current = await actor(); if (!current?.isSuperAdmin || !current.isActive) return NextResponse.json({ error: 'Only the Super Admin can delete administrators.' }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get('id')); const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'Administrator not found.' }, { status: 404 });
  if (target.email === ROOT_EMAIL || target.id === current.id || target.isSuperAdmin) return NextResponse.json({ error: 'The Super Admin account cannot be deleted.' }, { status: 400 });
  await db.user.delete({ where: { id } }); return NextResponse.json({ deleted: 1 });
}
