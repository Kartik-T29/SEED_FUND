import nodemailer from 'nodemailer';

type NotificationType = 'APPLICATION_SUBMITTED' | 'ASSESSMENT_COMPLETED' | 'DECISION_MADE';

interface NotificationData {
  to: string;
  applicationId: string;
  startupName?: string;
  decision?: string;
}

const SUBJECTS: Record<NotificationType, string> = {
  APPLICATION_SUBMITTED: 'IDEAPAD Seed Fund - Application Received',
  ASSESSMENT_COMPLETED: 'IDEAPAD Seed Fund - Assessment Completed',
  DECISION_MADE: 'IDEAPAD Seed Fund - Decision on Your Application',
};

const BODIES: Record<NotificationType, (data: NotificationData) => string> = {
  APPLICATION_SUBMITTED: (data) =>
    `Dear Applicant,\n\nYour seed fund application (ID: ${data.applicationId}) has been received and is under review by the Startup Evaluation Committee.\n\nYou will be notified once a decision is made.\n\nBest regards,\nIDEAPAD Team`,
  ASSESSMENT_COMPLETED: (data) =>
    `Dear Admin,\n\nAll SEC assessments for application ${data.applicationId} (${data.startupName}) have been completed.\n\nPlease log in to review and make a decision.\n\nBest regards,\nIDEAPAD System`,
  DECISION_MADE: (data) =>
    `Dear Applicant,\n\nA decision has been made on your seed fund application (ID: ${data.applicationId}).\n\nDecision: ${data.decision}\n\nPlease log in to view the details.\n\nBest regards,\nIDEAPAD Team`,
};

export async function sendNotification(type: NotificationType, data: NotificationData): Promise<void> {
  if (process.env.SMTP_ENABLED !== 'true') {
    console.log(`[Email Skipped] ${type}: to=${data.to}, app=${data.applicationId}`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@ideapad.co.in',
      to: data.to,
      subject: SUBJECTS[type],
      text: BODIES[type](data),
    });

    console.log(`[Email Sent] ${type}: to=${data.to}`);
  } catch (error) {
    console.error(`[Email Error] ${type}:`, error);
  }
}
