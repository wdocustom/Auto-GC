export interface NotifyClientOptions {
  userId: string;
  method: 'PUSH_AND_EMAIL' | 'EMAIL' | 'PUSH';
  subject: string;
  body: string;
  link: string;
}

/**
 * Sends a notification to a client via push notification and/or email.
 *
 * Replace this placeholder with your notification provider
 * (e.g., SendGrid for email, Firebase for push, Resend, etc.).
 */
export async function notifyClient(options: NotifyClientOptions): Promise<void> {
  // ----- Placeholder: replace with your actual notification service -----
  //
  // Email example (SendGrid):
  //   import sgMail from '@sendgrid/mail';
  //   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  //   await sgMail.send({
  //     to: clientEmail,
  //     from: 'updates@yourgcfirm.com',
  //     subject: options.subject,
  //     html: `<p>${options.body}</p><a href="${options.link}">View Update</a>`,
  //   });
  //
  // Push example (Firebase):
  //   import { getMessaging } from 'firebase-admin/messaging';
  //   await getMessaging().send({
  //     token: clientFcmToken,
  //     notification: { title: options.subject, body: options.body.slice(0, 200) },
  //     data: { link: options.link },
  //   });

  console.log(
    `[Notify] ${options.method} → User ${options.userId}: "${options.subject}" | Link: ${options.link}`,
  );
}
