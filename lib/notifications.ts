type MailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendTransactionalEmail(input: MailInput) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !from) {
    console.info("Email skipped (missing RESEND_API_KEY or RESEND_FROM_EMAIL)", {
      to: input.to,
      subject: input.subject
    });
    return { delivered: false, reason: "Email provider not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to send email via Resend: ${details}`);
  }

  return { delivered: true as const };
}
