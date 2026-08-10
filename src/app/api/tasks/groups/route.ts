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
    if (!name || !emails || name.trim().length === 0 || emails.trim().length === 0) {
      return NextResponse.json({ error: 'Name and emails are required' }, { status: 400 });
    }
    const newGroup = await db.userGroup.create({
      data: {
        name: name.trim(),
        emails: emails.trim(),
      },
    });
    return NextResponse.json(newGroup, { status: 201 });
  } catch (error: any) {
    console.error('Create user group error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Group name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
