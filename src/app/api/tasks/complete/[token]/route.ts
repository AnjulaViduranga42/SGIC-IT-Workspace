import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taskEmails } from '@/lib/task-email';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const task = await db.task.findUnique({ where: { completionToken: (await params).token }, include: { taskType: true } });
  if (!task) return NextResponse.json({ error: 'Task link is invalid.' }, { status: 404 });
  return NextResponse.json({ title: task.title, description: task.description, dueDate: task.dueDate, status: task.status, taskType: task.taskType.name, assignees: taskEmails(task.assigneeEmails), completedByEmail: task.completedByEmail });
}
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token; const task = await db.task.findUnique({ where: { completionToken: token } });
  if (!task) return NextResponse.json({ error: 'Task link is invalid.' }, { status: 404 });
  const { email } = await request.json(); const normalized = String(email || '').trim().toLowerCase();
  if (!taskEmails(task.assigneeEmails).includes(normalized)) return NextResponse.json({ error: 'Select an email assigned to this task.' }, { status: 403 });
  await db.task.update({ where: { id: task.id }, data: { status: 'COMPLETED', completedByEmail: normalized } });
  return NextResponse.json({ completed: true, completedByEmail: normalized });
}
