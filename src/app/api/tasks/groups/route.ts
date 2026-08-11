import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/auth';
import { taskEmails } from '@/lib/task-email';

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
    const groups = await db.userGroup.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Fetch user groups error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { name, emails } = await request.json();
    const normalizedEmails = taskEmails(emails);
    if (!name || name.trim().length === 0 || normalizedEmails.length === 0) {
      return NextResponse.json({ error: 'Name and emails are required' }, { status: 400 });
    }
    const newGroup = await db.userGroup.create({
      data: {
        name: name.trim(),
        emails: normalizedEmails.join(', '),
      },
    });
    return NextResponse.json(newGroup, { status: 201 });
  } catch (error: unknown) {
    console.error('Create user group error:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const { id, name, emails } = await request.json();
    const groupId = Number(id);
    const normalizedEmails = taskEmails(emails);
    if (!Number.isInteger(groupId) || !name?.trim() || normalizedEmails.length === 0) {
      return NextResponse.json({ error: 'Valid group, name, and emails are required' }, { status: 400 });
    }
    const group = await db.userGroup.update({
      where: { id: groupId },
      data: { name: name.trim(), emails: normalizedEmails.join(', ') },
    });
    return NextResponse.json(group);
  } catch (error: unknown) {
    console.error('Update user group error:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update email group' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'Valid group ID is required.' }, { status: 400 });
    await db.userGroup.delete({ where: { id } });
    return NextResponse.json({ deleted: 1 });
  } catch {
    return NextResponse.json({ error: 'Unable to delete email group.' }, { status: 400 });
  }
}
