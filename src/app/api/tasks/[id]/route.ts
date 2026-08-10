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
    const taskId = parseInt(id);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid Task ID' }, { status: 400 });
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

    // Check if task exists
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Determine if we need to reset the reminder alert
    // Reset reminder if the due date changes, or if we change the status back to PENDING from COMPLETED
    let resetReminder = false;
    if (dueDate && new Date(dueDate).getTime() !== task.dueDate.getTime()) {
      resetReminder = true;
    }
    if (status === 'PENDING' && task.status === 'COMPLETED') {
      resetReminder = true;
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        status: status !== undefined ? status : undefined,
        dueDate: dueDate !== undefined ? new Date(dueDate) : undefined,
        taskTypeId: taskTypeId !== undefined ? parseInt(taskTypeId) : undefined,
        reminderDaysBefore: reminderDaysBefore !== undefined ? parseInt(reminderDaysBefore) : undefined,
        assigneeEmails: assigneeEmails !== undefined ? assigneeEmails.trim() : undefined,
        userGroupId: userGroupId !== undefined ? (userGroupId ? parseInt(userGroupId) : null) : undefined,
        ...(resetReminder ? { reminderSentAt: null } : {}),
      },
      include: {
        taskType: true,
        userGroup: true,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
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
    const taskId = parseInt(id);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid Task ID' }, { status: 400 });
    }

    await db.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
