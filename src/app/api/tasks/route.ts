import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendTaskAssignment, taskEmails } from '@/lib/task-email';

const STATUSES = new Set(['COMPLETED', 'IN_PROGRESS', 'HOLD']);
async function authorized() { const token = (await cookies()).get('session')?.value; return Boolean(token && await decrypt(token)); }
export async function GET() { if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json(await db.task.findMany({ include: { taskType: true }, orderBy: { dueDate: 'asc' } })); }
export async function POST(request: Request) {
  try {
    if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const body = await request.json(); const status = STATUSES.has(body.status) ? body.status : 'IN_PROGRESS'; const emails = taskEmails(body.assigneeEmails);
    if (!body.title?.trim() || !body.dueDate || !body.taskTypeId) return NextResponse.json({ error: 'Title, due date, and task type are required.' }, { status: 400 });
    if (!emails.length) return NextResponse.json({ error: 'Select at least one assignee email.' }, { status: 400 });
    const task = await db.task.create({ data: { title: body.title.trim(), description: body.description?.trim() || '', status, dueDate: new Date(body.dueDate), reminderAt: body.reminderAt ? new Date(body.reminderAt) : null, taskTypeId: Number(body.taskTypeId), assigneeEmails: emails.join(', '), userGroupId: null }, include: { taskType: true } });
    const completionUrl = `${new URL(request.url).origin}/tasks/complete/${task.completionToken}`;
    await sendTaskAssignment({ emails, title: task.title, description: task.description, dueDate: task.dueDate, completionUrl });
    return NextResponse.json(task, { status: 201 });
  } catch (error) { console.error('Create task error:', error); return NextResponse.json({ error: 'Unable to create task.' }, { status: 500 }); }
}
