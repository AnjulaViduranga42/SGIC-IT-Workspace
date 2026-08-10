import { db } from './db';
import { sendEmail } from './email';

export async function runScheduler() {
  console.log('[Scheduler] Running reminder check at', new Date().toISOString());
  try {
    const now = new Date();
    
    // Find all pending tasks that haven't sent a reminder yet
    const pendingTasks = await db.task.findMany({
      where: {
        status: 'PENDING',
        reminderSentAt: null,
      },
      include: {
        taskType: true,
        userGroup: true,
      },
    });

    console.log(`[Scheduler] Found ${pendingTasks.length} pending tasks to evaluate.`);

    let sentCount = 0;

    for (const task of pendingTasks) {
      // Calculate when the reminder should be sent
      const dueDateMs = task.dueDate.getTime();
      const reminderOffsetMs = task.reminderDaysBefore * 24 * 60 * 60 * 1000;
      const reminderTime = new Date(dueDateMs - reminderOffsetMs);

      // Check if it's time to send the reminder
      if (now >= reminderTime) {
        console.log(`[Scheduler] Task "${task.title}" (ID: ${task.id}) is due for reminder. Due: ${task.dueDate}, Reminder Time: ${reminderTime}`);
        
        // Collect all emails
        const emailSet = new Set<string>();

        // Add group emails
        if (task.userGroup && task.userGroup.emails) {
          task.userGroup.emails
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0)
            .forEach(e => emailSet.add(e));
        }

        // Add individual assignee emails
        if (task.assigneeEmails) {
          task.assigneeEmails
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0)
            .forEach(e => emailSet.add(e));
        }

        const recipientList = Array.from(emailSet);

        if (recipientList.length > 0) {
          const subject = `SGIC IT Workspace Task Reminder: ${task.title}`;
          const formattedDueDate = task.dueDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
              <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 20px;">
                <h1 style="color: #6366f1; margin: 0; font-size: 24px; letter-spacing: 0.5px;">SGIC IT Workspace</h1>
                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Automated Task Reminder Alert</p>
              </div>
              <div style="padding: 10px 0;">
                <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0;">Hello,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0;">This is a scheduled notification that a task assigned to you or your user group is due shortly.</p>
                
                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-left: 4px solid #6366f1; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #6366f1; font-size: 18px;">${task.title}</h3>
                  <p style="margin: 5px 0; font-size: 14px; color: #94a3b8;"><strong style="color: #e2e8f0;">Task Type:</strong> ${task.taskType.name}</p>
                  <p style="margin: 5px 0; font-size: 14px; color: #e2e8f0;"><strong style="color: #e2e8f0;">Description:</strong> ${task.description}</p>
                  <p style="margin: 5px 0; font-size: 14px; color: #ff4d4d;"><strong style="color: #e2e8f0;">Due Date:</strong> ${formattedDueDate}</p>
                </div>
                
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-top: 30px;">
                  Please complete the task and update its status in the SGIC IT Workspace Dashboard.
                </p>
              </div>
              <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 20px; font-size: 12px; color: #64748b;">
                <p>This is an automated system email. Please do not reply directly.</p>
                <p>&copy; 2026 SGIC IT Workspace. All rights reserved.</p>
              </div>
            </div>
          `;

          // Send to each user in the group or individual
          for (const email of recipientList) {
            try {
              await sendEmail({ to: email, subject, html });
            } catch (error) {
              console.error(`[Scheduler] Failed to send email to ${email}:`, error);
            }
          }

          // Mark task as notified
          await db.task.update({
            where: { id: task.id },
            data: { reminderSentAt: now }
          });

          sentCount++;
        } else {
          console.warn(`[Scheduler] Task "${task.title}" has no assignees or group emails to notify.`);
        }
      }
    }

    console.log(`[Scheduler] Reminder run finished. Sent reminders for ${sentCount} tasks.`);
    return { success: true, processed: pendingTasks.length, sent: sentCount };
  } catch (error) {
    console.error('[Scheduler] Error running task scheduler:', error);
    return { success: false, error: error };
  }
}
