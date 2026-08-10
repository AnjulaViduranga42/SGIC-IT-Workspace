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

    const tasks = await db.task.findMany({
      include: {
        taskType: true,
        userGroup: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const {
      title,
      description,
      status,
      dueDate,
      taskTypeId,
      reminderDaysBefore,
      assigneeEmails,
      userGroupId,
    } = await request.json();

    if (!title || !dueDate || !taskTypeId) {
      return NextResponse.json({ error: 'Title, due date, and task type are required' }, { status: 400 });
    }

    const newTask = await db.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        status: status || 'PENDING',
        dueDate: new Date(dueDate),
        taskTypeId: parseInt(taskTypeId),
        reminderDaysBefore: parseInt(reminderDaysBefore || '1'),
        assigneeEmails: assigneeEmails?.trim() || '',
        userGroupId: userGroupId ? parseInt(userGroupId) : null,
      },
      include: {
        taskType: true,
        userGroup: true,
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
