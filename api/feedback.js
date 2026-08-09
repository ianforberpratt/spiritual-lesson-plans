// Vercel serverless function backing the site-wide feedback widget
// (assets/js/main.js, initFeedback). Sends the submission by email via
// Resend's REST API — no SDK dependency, matching the pattern used on
// the Ties Foundation site's api/contact.js.

const ALLOWED_KINDS = ["Question", "Confused", "Not happy", "Idea", "Just saying hi"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (err) {
      body = {};
    }
  }
  body = body && typeof body === "object" ? body : {};

  // Honeypot: real visitors never see or fill this field. A bot that fills
  // every field trips it — respond as if it worked and do nothing further.
  const honeypot = typeof body.hp === "string" ? body.hp.trim() : "";
  if (honeypot) {
    return res.status(200).json({ ok: true });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: "Message is too long" });
  }

  const kind = ALLOWED_KINDS.includes(body.kind) ? body.kind : "Question";

  const from = typeof body.from === "string" ? body.from.trim() : "";
  if (from && !EMAIL_PATTERN.test(from)) {
    return res.status(400).json({ error: "That email address doesn't look right" });
  }

  const page = typeof body.page === "string" ? body.page.slice(0, 500) : "";

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("feedback: RESEND_API_KEY is not set");
    return res.status(500).json({ error: "Server is not configured to send email" });
  }

  const notifyTo = process.env.NOTIFY_TO || "ianforberpratt@gmail.com";
  const notifyFrom = process.env.NOTIFY_FROM || "onboarding@resend.dev";

  const bodyLines = [
    `Kind: ${kind}`,
    "",
    message,
    "",
    `From: ${from || "(not provided)"}`,
  ];
  if (page) bodyLines.push(`Page: ${page}`);

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Spiritual Lesson Plans <${notifyFrom}>`,
        to: [notifyTo],
        reply_to: from || undefined,
        subject: `Spiritual Lesson Plans feedback: ${kind}`,
        text: bodyLines.join("\n"),
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("feedback: Resend error", resendRes.status, errText);
      return res.status(502).json({ error: "Could not send the message" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("feedback: send failed", err);
    return res.status(502).json({ error: "Could not send the message" });
  }
};
