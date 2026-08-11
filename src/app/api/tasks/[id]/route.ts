import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendTaskAssignment, taskEmails } from '@/lib/task-email';

const STATUSES = new Set(['COMPLETED', 'IN_PROGRESS', 'HOLD']);
async function authorized() { const token = (await cookies()).get('session')?.value; return Boolean(token && await decrypt(token)); }
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 }); const id = Number((await params).id); const body = await request.json();
    const existing = await db.task.findUnique({ where: { id } }); if (!existing) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    if (body.status !== undefined && !STATUSES.has(body.status)) return NextResponse.json({ error: 'Invalid task status.' }, { status: 400 });
    const emails = body.assigneeEmails !== undefined ? taskEmails(body.assigneeEmails) : taskEmails(existing.assigneeEmails);
    if (body.assigneeEmails !== undefined && !emails.length) return NextResponse.json({ error: 'Select at least one assignee email.' }, { status: 400 });
    const reminderChanged = body.reminderAt !== undefined && (body.reminderAt ? new Date(body.reminderAt).getTime() : null) !== existing.reminderAt?.getTime();
    const task = await db.task.update({ where: { id }, data: { title: body.title !== undefined ? body.title.trim() : undefined, description: body.description !== undefined ? body.description.trim() : undefined, status: body.status, dueDate: body.dueDate ? new Date(body.dueDate) : undefined, reminderAt: body.reminderAt !== undefined ? (body.reminderAt ? new Date(body.reminderAt) : null) : undefined, taskTypeId: body.taskTypeId !== undefined ? Number(body.taskTypeId) : undefined, assigneeEmails: body.assigneeEmails !== undefined ? emails.join(', ') : undefined, userGroupId: null, completedByEmail: body.status !== undefined ? (body.status === 'COMPLETED' ? existing.completedByEmail : null) : undefined, ...(reminderChanged ? { reminderSentAt: null } : {}) }, include: { taskType: true } });
    if (body.assigneeEmails !== undefined && emails.join(', ') !== taskEmails(existing.assigneeEmails).join(', ')) { const completionUrl = `${new URL(request.url).origin}/tasks/complete/${task.completionToken}`; await sendTaskAssignment({ emails, title: task.title, description: task.description, dueDate: task.dueDate, completionUrl }); }
    return NextResponse.json(task);
  } catch (error) { console.error('Update task error:', error); return NextResponse.json({ error: 'Unable to update task.' }, { status: 500 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 }); await db.task.delete({ where: { id: Number((await params).id) } }); return NextResponse.json({ deleted: 1 }); } catch { return NextResponse.json({ error: 'Unable to delete task.' }, { status: 400 }); } }
