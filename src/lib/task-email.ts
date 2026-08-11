import { sendEmail } from '@/lib/email';

export function taskEmails(value: string | null | undefined) {
  return [...new Set((value || '').split(',').map((email) => email.trim().toLowerCase()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export async function sendTaskAssignment({ emails, title, description, dueDate, completionUrl }: { emails: string[]; title: string; description: string; dueDate: Date; completionUrl: string }) {
  const subject = `SGIC task assigned: ${title}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px;color:#172033"><h2 style="color:#4f46e5">New task assigned</h2><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description || 'No description provided.')}</p><p><strong>Due:</strong> ${dueDate.toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}</p><p style="margin:28px 0"><a href="${completionUrl}" style="background:#4f46e5;color:white;text-decoration:none;padding:12px 18px;border-radius:8px">View task and mark completed</a></p><p style="color:#64748b;font-size:12px">This secure link may be used only by a listed assignee.</p></div>`;
  await Promise.allSettled(emails.map((to) => sendEmail({ to, subject, html })));
}

export async function sendTaskGroupNotification({ emails, title, description, dueDate, event = 'assigned' }: { emails: string[]; title: string; description: string; dueDate: Date; event?: 'assigned' | 'reminder' | 'due' }) {
  if (!emails.length) return;
  const heading = event === 'due' ? 'Task is due now' : event === 'reminder' ? 'Task reminder' : 'Task notification';
  const subject = `SGIC ${heading.toLowerCase()}: ${title}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px;color:#172033"><h2 style="color:#4f46e5">${heading}</h2><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description || 'No description provided.')}</p><p><strong>Due:</strong> ${dueDate.toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}</p><p style="color:#64748b;font-size:12px">You are receiving this informational notification through an SGIC task email group. Only the primary assignee can update or complete the task.</p></div>`;
  await Promise.allSettled(emails.map((to) => sendEmail({ to, subject, html })));
}
