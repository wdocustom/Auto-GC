import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

/**
 * Sends an outbound SMS from a project's dedicated phone number
 * to a subcontractor or client.
 *
 * @param from - The project's dedicated Twilio number (e.g. "+15551234567")
 * @param to - The recipient's phone number
 * @param body - The message text (max 1600 chars for Twilio)
 * @returns The Twilio message SID
 */
export async function sendSystemSMS(
  from: string,
  to: string,
  body: string,
): Promise<string> {
  const message = await client.messages.create({
    from,
    to,
    body,
  });

  console.log(`[Twilio] SMS sent: ${message.sid} | ${from} → ${to}`);
  return message.sid;
}
