import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'no-reply@sgic.lk';

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log('====== MOCK EMAIL SENT ======');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html}`);
    console.log('=============================');
    return { mock: true, messageId: 'mock-id-' + Date.now() };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: `"SGIC IT Workspace" <${smtpFrom}>`,
    to,
    subject,
    html,
  });

  console.log(`Email successfully sent to ${to}: ${info.messageId}`);
  return info;
}
