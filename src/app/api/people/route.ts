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
    const people = await db.person.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(people);
  } catch (error) {
    console.error('Fetch people error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { name, email } = await request.json();
    if (!name || !email || name.trim().length === 0 || email.trim().length === 0) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    
    // Check if email already exists
    const existing = await db.person.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
    if (existing) {
      return NextResponse.json({ error: 'A staff person with this email already exists' }, { status: 400 });
    }

    const newPerson = await db.person.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
      },
    });
    return NextResponse.json(newPerson, { status: 201 });
  } catch (error) {
    console.error('Create person error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
