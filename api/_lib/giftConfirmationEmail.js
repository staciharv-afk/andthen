// The "Your gift is on its way" confirmation, sent to the gifter after a
// successful gift checkout (see api/stripe-webhook.js's handleGiftCheckout).
//
// Every other transactional email in this app is plain-text only, sent via
// Resend's /emails API. This one is the first with a branded HTML body —
// still the same Resend call, just with `html` alongside `text` so Resend
// delivers multipart (HTML for clients that render it, text for the rest).
//
// The HTML is a plain template literal, not a templating engine — the
// project has no email-template library and this is the only rich email,
// so a function returning a string keeps it self-contained. All dynamic
// values pass through esc() first (names are user-supplied via Stripe
// Checkout metadata).
//
// Fonts: Lora + DM Sans load via <link> for clients that allow it; the
// Georgia / Helvetica fallback stack carries every client that strips
// external fonts (most of them), which is why the design never depends on
// the web fonts for legibility — only for a bit of extra character.

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const firstName = (full) => String(full || "").trim().split(/\s+/)[0] || "";

// { recipientName, gifterName, giftMessage } -> { subject, html, text }
export function renderGiftConfirmationEmail({ recipientName, gifterName, giftMessage } = {}) {
  const recipient = firstName(recipientName) || "them";
  const gifter = firstName(gifterName); // may be "" — the form makes it optional
  const hasNote = Boolean(String(giftMessage || "").trim());

  const subject = "Your gift is on its way";

  const greetingLine = gifter ? `Hi ${gifter},` : null;
  const step1Tail = hasNote
    ? "— with the note you wrote them."
    : "— ready whenever they open it.";

  const text = [
    greetingLine,
    greetingLine ? "" : null,
    `Thank you for giving ${recipient} the gift of capturing a loved one's story.`,
    "",
    `We've sent ${recipient} everything they need to begin — a page to fill in, an invitation to send to family and friends, and no clock running on when to start.`,
    "",
    "What happens now:",
    `1. ${recipient} gets your invitation ${step1Tail}`,
    "2. They start the page — free, whenever they're ready.",
    "3. Stories start arriving — from everyone they invite in.",
    "",
    `There's no deadline on a story — ${recipient} can start whenever they're ready.`,
    "",
    `Questions about ${recipient}'s gift? Just reply to this email — a person reads these.`,
    "",
    "— And Then",
    "A living story for someone you love.",
    "© 2026 And Then. Sent because you gifted a page on myandthen.com.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const R = esc(recipient);
  const G = esc(gifter);

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${esc(subject)}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
<style>
  body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #EAE2D3; }
  a { text-decoration: none; }
  .serif { font-family: 'Lora', Georgia, 'Times New Roman', serif; }
  .sans { font-family: 'DM Sans', Helvetica, Arial, sans-serif; }
  @media only screen and (max-width: 600px) {
    .email-container { width: 100% !important; }
    .fluid-padding { padding-left: 24px !important; padding-right: 24px !important; }
    .stack-hide { display: none !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#EAE2D3;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    Your gift for ${R} is confirmed &mdash; here's what happens next.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EAE2D3;">
    <tr>
      <td align="center" style="padding: 48px 16px;">

        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#FDFAF5;">

          <!-- Header / wordmark -->
          <tr>
            <td class="fluid-padding" style="padding: 36px 48px 28px 48px; border-bottom: 1px solid rgba(45,33,24,0.12);">
              <span class="serif" style="font-size: 22px; font-style: italic; color: #B85C2C; letter-spacing: 0.01em;">And Then&hellip;</span>
            </td>
          </tr>

          <!-- Eyebrow + headline -->
          <tr>
            <td class="fluid-padding" style="padding: 44px 48px 0 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-bottom: 1px solid #B85C2C; width: 28px; padding-bottom: 8px;">&nbsp;</td>
                  <td style="width: 10px;">&nbsp;</td>
                  <td class="sans" style="font-size: 11px; font-weight: 500; letter-spacing: 0.14em; color: #B85C2C; padding-bottom: 8px;">A GIFT, GIVEN</td>
                </tr>
              </table>
              <h1 class="serif" style="margin: 18px 0 0 0; font-size: 32px; line-height: 1.28; font-weight: 400; color: #2D2118;">
                Thank you for giving ${R} <em style="color:#B85C2C; font-style: italic;">the gift of capturing a loved one's story</em>.
              </h1>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td class="fluid-padding" style="padding: 22px 48px 0 48px;">
              ${G ? `<p class="sans" style="margin:0 0 14px 0; font-size: 16px; line-height: 1.7; color: #5B4636;">Hi ${G},</p>` : ""}
              <p class="sans" style="margin:0; font-size: 16px; line-height: 1.7; color: #5B4636;">
                We've sent ${R} everything they need to begin &mdash; a page to fill in, an invitation to send to family and friends, and no clock running on when to start.
              </p>
            </td>
          </tr>

          <!-- Confirmation panel -->
          <tr>
            <td class="fluid-padding" style="padding: 32px 48px 0 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5EDE0;">
                <tr>
                  <td style="padding: 28px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="sans" style="font-size: 11px; font-weight: 500; letter-spacing: 0.14em; color: #B85C2C;">WHAT HAPPENS NOW</td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px;">
                      <tr>
                        <td valign="top" style="padding: 10px 0; border-top: 1px solid rgba(45,33,24,0.10);">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td valign="top" width="26" class="serif" style="font-size: 17px; color: #B85C2C; padding-top: 1px;">1</td>
                              <td valign="top" class="sans" style="font-size: 14.5px; line-height: 1.6; color: #2D2118;">
                                <strong>${R} gets your invitation</strong><span style="color:#7A5C42;"> ${hasNote ? "&mdash; with the note you wrote them." : "&mdash; ready whenever they open it."}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0; border-top: 1px solid rgba(45,33,24,0.10);">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td valign="top" width="26" class="serif" style="font-size: 17px; color: #B85C2C; padding-top: 1px;">2</td>
                              <td valign="top" class="sans" style="font-size: 14.5px; line-height: 1.6; color: #2D2118;">
                                <strong>They start the page</strong><span style="color:#7A5C42;"> &mdash; free, whenever they're ready.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding: 10px 0 2px 0; border-top: 1px solid rgba(45,33,24,0.10);">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td valign="top" width="26" class="serif" style="font-size: 17px; color: #B85C2C; padding-top: 1px;">3</td>
                              <td valign="top" class="sans" style="font-size: 14.5px; line-height: 1.6; color: #2D2118;">
                                <strong>Stories start arriving</strong><span style="color:#7A5C42;"> &mdash; from everyone they invite in.</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reassurance -->
          <tr>
            <td class="fluid-padding" align="left" style="padding: 32px 48px 0 48px;">
              <p class="sans" style="margin: 0; font-size: 13.5px; color:#7A5C42;">
                There's no deadline on a story &mdash; ${R} can start whenever they're ready.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td class="fluid-padding" style="padding: 40px 48px 0 48px;">
              <div style="border-top: 1px solid rgba(45,33,24,0.12);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="fluid-padding" style="padding: 28px 48px 40px 48px;">
              <span class="serif" style="font-size: 15px; font-style: italic; color: #B85C2C;">And Then&hellip;</span>
              <p class="sans" style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #7A5C42;">
                A living story for someone you love.
              </p>
              <p class="sans" style="margin: 18px 0 0 0; font-size: 12px; line-height: 1.7; color: #A08D79;">
                Questions about ${R}'s gift? Just reply to this email &mdash; a person reads these.<br />
                &copy; 2026 And Then. Sent because you gifted a page on myandthen.com.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
