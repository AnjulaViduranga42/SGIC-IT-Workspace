import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { decrypt } from '@/lib/auth';
import { db } from '@/lib/db';

async function authorized() { const token = (await cookies()).get('session')?.value; return Boolean(token && await decrypt(token)); }
export async function GET() { if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json(await db.taskType.findMany({ orderBy: { name: 'asc' } })); }
export async function POST(request: Request) { try { if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 }); const { name } = await request.json(); if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 }); return NextResponse.json(await db.taskType.create({ data: { name: name.trim() } }), { status: 201 }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ error: 'Task type already exists.' }, { status: 409 }); return NextResponse.json({ error: 'Unable to create task type.' }, { status: 500 }); } }
export async function DELETE(request: Request) { try { if (!(await authorized())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 }); const id = Number(new URL(request.url).searchParams.get('id')); if (!Number.isInteger(id)) return NextResponse.json({ error: 'Valid task type ID is required.' }, { status: 400 }); await db.taskType.delete({ where: { id } }); return NextResponse.json({ deleted: 1 }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return NextResponse.json({ error: 'This task type is used by existing tasks and cannot be deleted.' }, { status: 409 }); return NextResponse.json({ error: 'Unable to delete task type.' }, { status: 400 }); } }
